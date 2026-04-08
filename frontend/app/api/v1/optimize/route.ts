import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// ─── File text extraction ─────────────────────────────────────────────────────

async function extractText(file: File): Promise<string> {
  const type = file.type;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (type === "text/plain") {
    return buffer.toString("utf-8");
  }

  if (
    type ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const mammoth = (await import("mammoth")).default;
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (type === "application/pdf") {
    // Import from lib path to avoid pdf-parse's self-test (which requires
    // a file at test/data/05-versions-space.pdf that doesn't exist in app dirs)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse/lib/pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
    const result = await pdfParse(buffer);
    return result.text;
  }

  throw new Error(`Unsupported file type: ${type}`);
}

// ─── OpenAI calls ─────────────────────────────────────────────────────────────

async function optimizeResume(
  client: OpenAI,
  resumeText: string,
  jobDescription: string
) {
  const res = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: `You are an expert resume writer and ATS optimization specialist.

Your task: Rewrite the resume to maximize ATS compatibility with the job description.

Rules:
- ONLY rewrite existing content. Do NOT fabricate experience, skills, or achievements.
- Every experience bullet MUST follow this exact formula: [Strong Action Verb] + [Specific What You Did] + [Measurable Outcome].
  Example: "Reduced deployment time by 40% by migrating CI pipeline to GitHub Actions."
- If no exact metric exists in the original, infer a reasonable one from context (e.g. ~30%, 5×, $X0K, X team members).
- NEVER start a bullet with: 'Responsible for', 'Helped', 'Assisted', 'Worked on', 'Involved in', 'Participated in', 'Contributed to'.
- Each bullet must be one tight sentence — aim for 15–22 words.
- Naturally incorporate relevant keywords from the job description.
- Keep all dates, job titles, and company names exactly as they are.
- Remove tables, columns, headers/footers — use clean single-column plain text.
- Format for ATS: clear section headers (EXPERIENCE, EDUCATION, SKILLS, etc.)

Return ONLY valid JSON with this exact structure:
{
  "optimized_resume": "<full rewritten resume as plain text>",
  "changes_made": ["<change 1>", "<change 2>"],
  "keywords_added": ["<keyword 1>", "<keyword 2>"]
}

ORIGINAL RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });
  return JSON.parse(res.choices[0].message.content!);
}

async function scoreResume(
  client: OpenAI,
  resumeText: string,
  jobDescription: string
) {
  const res = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: `You are an expert ATS resume analyst. Analyze the resume against the job description.

Scoring criteria:
- keyword_coverage: how many of the JD's required keywords/skills appear in the resume
- skills_alignment: how well the candidate's experience matches the role's requirements
- formatting_compliance: ATS-friendliness (clean structure, no tables/columns, standard section headers)

Important rules:
- Do NOT penalise the resume for not mentioning the target company's name — resumes never should.
- Do NOT penalise for lack of a cover letter or professional network — those are separate documents.
- Evaluate ONLY what belongs in a resume: skills, experience, achievements, keywords, and formatting.
- The summary must describe the resume's ATS match quality, nothing else.
- Be precise and consistent — different resumes with different keyword counts should receive noticeably different scores.

Return ONLY valid JSON with this exact structure:
{
  "overall_score": <integer 0-100>,
  "keyword_coverage": <integer 0-100>,
  "skills_alignment": <integer 0-100>,
  "formatting_compliance": <integer 0-100>,
  "matched_keywords": ["<keyword>"],
  "missing_keywords": ["<keyword>"],
  "summary": "<one sentence ATS match summary>"
}

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
  });
  return JSON.parse(res.choices[0].message.content!);
}

// ─── Shortlist assessment ─────────────────────────────────────────────────────

async function assessResume(
  client: OpenAI,
  optimizedResume: string,
  jobDescription: string | null,
  mode: "targeted" | "general"
) {
  const isTargeted = mode === "targeted" && jobDescription;

  const prompt = isTargeted
    ? `You are a brutally honest senior recruiter with 15+ years of experience. Assess this candidate's resume against the job description and give a frank, constructive shortlist assessment.

Be specific. Reference actual content from the resume. Do NOT give generic advice.

Return ONLY valid JSON:
{
  "shortlist_probability": "<Low | Fair | Good | Strong>",
  "probability_rationale": "<one sentence explaining the verdict>",
  "strengths": ["<specific strength from the resume>", "<specific strength>", "<specific strength>"],
  "critical_gaps": ["<specific gap or mismatch vs the JD>", "<gap>"],
  "quick_wins": ["<one concrete actionable change — be specific>", "<change>", "<change>"],
  "red_flags": ["<recruiter concern — e.g. short tenure, vague bullets, unexplained gap>"],
  "skills_heatmap": [
    { "skill": "<JD skill name>", "status": "<matched | transferable | gap>" }
  ],
  "transferable_bridges": [
    { "skill": "<skill name>", "bridge": "<one honest sentence mapping what they DO have to this requirement>" }
  ],
  "gap_roadmap": [
    { "skill": "<skill name>", "action": "<specific cert / project / course to close this gap — name it explicitly>" }
  ]
}

Rules:
- strengths: 2–4 items. Quote or reference specific content.
- critical_gaps: 1–4 items. Only real gaps — things in the JD the resume doesn't address. If none, return [].
- quick_wins: exactly 3 items. Must be doable by the candidate right now (not "get more experience").
- red_flags: 0–3 items. Only genuine recruiter concerns. If none, return [].
- shortlist_probability: Low = very unlikely, Fair = possible but significant gaps, Good = likely shortlisted, Strong = very strong match.
- skills_heatmap: list EVERY skill/tool/technology mentioned in the JD. Status: "matched" = clearly present in resume, "transferable" = not exact but adjacent experience exists, "gap" = genuinely missing.
- transferable_bridges: include ONLY skills with status "transferable". For each, write one honest sentence showing how existing experience maps across.
- gap_roadmap: include ONLY skills with status "gap". For each, name a specific cert, online course, or side project the candidate can do (e.g. "Complete the AWS Solutions Architect Associate cert on A Cloud Guru — 2–4 weeks").

OPTIMIZED RESUME:
${optimizedResume}

JOB DESCRIPTION:
${jobDescription}`
    : `You are a brutally honest senior career coach. Assess this resume for general professional quality and market readiness.

Be specific. Reference actual content. Do NOT give generic advice.

Return ONLY valid JSON:
{
  "shortlist_probability": "<Low | Fair | Good | Strong>",
  "probability_rationale": "<one sentence on general market readiness>",
  "strengths": ["<specific strength from the resume>", "<specific strength>"],
  "critical_gaps": ["<specific quality issue — e.g. no quantified achievements, weak summary>"],
  "quick_wins": ["<one concrete actionable change>", "<change>", "<change>"],
  "red_flags": ["<recruiter concern>"]
}

Rules:
- Evaluate general quality, not job-fit.
- strengths: 2–4 items referencing actual content.
- critical_gaps: real quality issues only.
- quick_wins: exactly 3 doable actions.
- red_flags: 0–3 genuine concerns, or [].

RESUME:
${optimizedResume}`;

  const res = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });
  return JSON.parse(res.choices[0].message.content!);
}

async function generateCoverLetter(
  client: OpenAI,
  optimizedResume: string,
  jobDescription: string
) {
  const res = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: `You are an expert career coach and professional writer.

Write a compelling, personalized cover letter based on the candidate's experience and the JD.

Rules:
- Write in first person, professional but engaging tone.
- Connect specific experiences from the resume to specific requirements in the JD.
- Do NOT use generic filler phrases like "I am a hard worker" or "team player".
- 3-4 paragraphs maximum.
- No "Dear Hiring Manager" — use a strong opening hook instead.

Return ONLY valid JSON: { "cover_letter": "<full cover letter text>" }

CANDIDATE RESUME:
${optimizedResume}

JOB DESCRIPTION:
${jobDescription}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.5,
  });
  return JSON.parse(res.choices[0].message.content!);
}

// ─── General mode (no JD) functions ─────────────────────────────────────────

// ─── Assessment-driven refinement ────────────────────────────────────────────

async function refineWithAssessment(
  client: OpenAI,
  optimizedResume: string,
  assessment: Record<string, unknown>,
  jobDescription: string | null
) {
  const quickWins = (assessment.quick_wins as string[])
    .map((w, i) => `${i + 1}. ${w}`)
    .join("\n");
  const gaps = ((assessment.critical_gaps as string[]) ?? [])
    .map((g) => `- ${g}`)
    .join("\n");
  const jdSection = jobDescription
    ? `\nJOB DESCRIPTION (for keyword context):\n${jobDescription}`
    : "";

  const res = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: `You are an expert resume writer. This resume has already been ATS-optimized, but a recruiter assessment identified specific improvements. Apply ALL of them to produce the definitive final version.

IMPROVEMENTS TO APPLY:
${gaps ? `Critical gaps to address:\n${gaps}\n` : ""}
Quick wins to implement:
${quickWins}

Rules:
- Apply EVERY quick win and address EVERY critical gap where possible within the existing content.
- Do NOT fabricate experience, companies, dates, qualifications, or skills not present in the original.
- Every experience bullet MUST follow: [Strong Action Verb] + [Specific What You Did] + [Measurable Outcome].
  If no exact metric exists in the current text, infer a credible one from context (e.g. "supporting 500+ daily users", "reducing processing time by ~25%").
- NEVER start a bullet with: 'Responsible for', 'Helped', 'Assisted', 'Worked on', 'Involved in'.
- Each bullet should be one tight sentence — 15–22 words.
- Maintain clean single-column ATS formatting: clear section headers, no tables/columns.
- Keep all dates, job titles, and company names exactly as they are.
- The result should be the strongest possible honest version of this resume.

Return ONLY valid JSON:
{
  "refined_resume": "<full final resume as plain text>",
  "improvements_applied": ["<specific change made>", "<change>"]
}

CURRENT OPTIMIZED RESUME:
${optimizedResume}${jdSection}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });
  return JSON.parse(res.choices[0].message.content!);
}


async function optimizeResumeGeneral(client: OpenAI, resumeText: string) {
  const res = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: `You are an expert resume writer. Improve this resume for general quality — clarity, action language, structure, and completeness.

Rules:
- ONLY rewrite existing content. Do NOT fabricate experience, skills, or achievements.
- Every experience bullet MUST follow: [Strong Action Verb] + [Specific What You Did] + [Measurable Outcome].
  Example: "Cut customer support resolution time by 30% by building an internal knowledge-base tool."
- If no exact metric exists, infer a reasonable one from context (e.g. ~20%, 3×, X team members, $X0K budget).
- NEVER start a bullet with: 'Responsible for', 'Helped', 'Assisted', 'Worked on', 'Involved in', 'Participated in'.
- Each bullet must be one tight sentence — aim for 15–22 words.
- Improve structure and section ordering for readability.
- Remove tables, columns, graphics — use clean single-column plain text.
- Use clear section headers (EXPERIENCE, EDUCATION, SKILLS, SUMMARY, etc.)
- Keep all dates, job titles, and company names exactly as they are.

Return ONLY valid JSON:
{
  "optimized_resume": "<full rewritten resume as plain text>",
  "changes_made": ["<change 1>", "<change 2>"]
}

RESUME:
${resumeText}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });
  return JSON.parse(res.choices[0].message.content!);
}

async function scoreResumeGeneral(client: OpenAI, resumeText: string) {
  const res = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: `You are an expert resume coach. Evaluate this resume on general quality — not for a specific job.

Scoring criteria:
- clarity: Is the resume easy to read? Are sentences clear, concise, and free of jargon? (0-100)
- action_language: Are bullet points written with strong action verbs and specific achievements? (0-100)
- structure: Is information logically organized with appropriate sections and formatting? (0-100)
- completeness: Does it include all critical sections (contact, experience, education, skills) with enough detail? (0-100)

Rules:
- overall_score is the average of the four criteria rounded to the nearest integer.
- The summary describes the resume's general quality in one sentence.
- Be precise and consistent — give noticeably different scores for different quality levels.

Return ONLY valid JSON:
{
  "overall_score": <integer 0-100>,
  "clarity": <integer 0-100>,
  "action_language": <integer 0-100>,
  "structure": <integer 0-100>,
  "completeness": <integer 0-100>,
  "summary": "<one sentence general quality summary>"
}

RESUME:
${resumeText}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
  });
  return JSON.parse(res.choices[0].message.content!);
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { detail: "OPENAI_API_KEY is not set. Add it to .env.local." },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const jobDescription = formData.get("job_description") as string | null;
    const mode = (formData.get("mode") as string | null) ?? "targeted";

    if (!file) {
      return NextResponse.json(
        { detail: "Missing resume file." },
        { status: 400 }
      );
    }

    if (mode === "targeted" && !jobDescription) {
      return NextResponse.json(
        { detail: "Missing job_description for targeted mode." },
        { status: 400 }
      );
    }

    const resumeText = await extractText(file);

    if (resumeText.trim().length < 50) {
      return NextResponse.json(
        { detail: "Could not extract enough text from the uploaded file." },
        { status: 422 }
      );
    }

    const client = new OpenAI({ apiKey });

    if (mode === "general") {
      // General mode: no JD — score + optimize independently, no cover letter
      const [scoreBefore, optimizeResult] = await Promise.all([
        scoreResumeGeneral(client, resumeText),
        optimizeResumeGeneral(client, resumeText),
      ]);

      const [scoreAfter, assessment] = await Promise.all([
        scoreResumeGeneral(client, optimizeResult.optimized_resume),
        assessResume(client, optimizeResult.optimized_resume, null, "general"),
      ]);

      // Step 3 — apply assessment fixes to produce the final polished resume
      const refineResult = await refineWithAssessment(
        client,
        optimizeResult.optimized_resume,
        assessment,
        null
      );

      return NextResponse.json({
        mode: "general",
        score_before: scoreBefore,
        score_after: scoreAfter,
        optimized_resume: refineResult.refined_resume ?? optimizeResult.optimized_resume,
        changes_made: [
          ...(optimizeResult.changes_made ?? []),
          ...(refineResult.improvements_applied ?? []),
        ],
        keywords_added: [],
        cover_letter: "",
        assessment,
      });
    }

    // Targeted mode — existing flow
    // Step 1 — score original + optimize in parallel (both only need original text + JD)
    const [scoreBefore, optimizeResult] = await Promise.all([
      scoreResume(client, resumeText, jobDescription!),
      optimizeResume(client, resumeText, jobDescription!),
    ]);

    // Step 2 — score the optimized resume + generate cover letter + assess in parallel
    const [scoreAfter, coverResult, assessment] = await Promise.all([
      scoreResume(client, optimizeResult.optimized_resume, jobDescription!),
      generateCoverLetter(client, optimizeResult.optimized_resume, jobDescription!),
      assessResume(client, optimizeResult.optimized_resume, jobDescription!, "targeted"),
    ]);

    // Step 3 — apply every assessment fix to produce the definitive final resume
    const refineResult = await refineWithAssessment(
      client,
      optimizeResult.optimized_resume,
      assessment,
      jobDescription!
    );

    return NextResponse.json({
      mode: "targeted",
      score_before: scoreBefore,
      score_after: scoreAfter,
      optimized_resume: refineResult.refined_resume ?? optimizeResult.optimized_resume,
      changes_made: [
        ...(optimizeResult.changes_made ?? []),
        ...(refineResult.improvements_applied ?? []),
      ],
      keywords_added: optimizeResult.keywords_added ?? [],
      cover_letter: coverResult.cover_letter ?? "",
      assessment,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error";
    console.error("[optimize route]", err);
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}

// Dead code below — mock data kept for offline reference only
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _mockResponse() {

  return NextResponse.json({
    score_before: {
      overall_score: 38,
      keyword_coverage: 32,
      skills_alignment: 41,
      formatting_compliance: 55,
      matched_keywords: ["Python", "REST API", "SQL"],
      missing_keywords: [
        "TypeScript",
        "CI/CD",
        "Docker",
        "Agile",
        "Kubernetes",
        "AWS",
        "Microservices",
        "GraphQL",
      ],
      summary:
        "Resume has limited keyword alignment with the job description. Several critical technical skills are missing or not clearly stated.",
    },
    score_after: {
      overall_score: 91,
      keyword_coverage: 88,
      skills_alignment: 93,
      formatting_compliance: 94,
      matched_keywords: [
        "Python",
        "TypeScript",
        "REST API",
        "SQL",
        "CI/CD",
        "Docker",
        "Agile",
        "Kubernetes",
        "AWS",
        "Microservices",
        "GraphQL",
        "System Design",
        "Node.js",
      ],
      missing_keywords: ["Terraform"],
      summary:
        "Excellent alignment. Resume now mirrors the job description's language and priorities. ATS pass rate significantly improved.",
    },
    optimized_resume: `JANE DOE
jane.doe@email.com | linkedin.com/in/janedoe | github.com/janedoe | +1 (555) 000-0000

PROFESSIONAL SUMMARY
Results-driven Software Engineer with 6+ years of experience building scalable
microservices and REST APIs using Python, TypeScript, and Node.js. Proven track
record deploying production systems on AWS with Docker and Kubernetes, following
Agile best practices and CI/CD pipelines. Passionate about clean code and system
design at scale.

TECHNICAL SKILLS
Languages:    Python, TypeScript, JavaScript, SQL, Bash
Backend:      FastAPI, Node.js, GraphQL, REST API design, Microservices
Cloud & DevOps: AWS (EC2, S3, Lambda, RDS), Docker, Kubernetes, CI/CD (GitHub Actions)
Databases:    PostgreSQL, Redis, MongoDB
Practices:    Agile/Scrum, TDD, System Design, Code Review

WORK EXPERIENCE

Senior Software Engineer — Acme Corp (2022–Present)
• Architected and deployed 12 microservices on AWS, reducing latency by 40%
• Led migration from monolith to event-driven architecture using Kafka and Docker
• Implemented CI/CD pipelines with GitHub Actions, cutting deploy time from 2h to 8min
• Mentored 3 junior engineers; introduced GraphQL layer improving API flexibility

Software Engineer — TechStart Inc (2019–2022)
• Built REST APIs in Python/FastAPI serving 2M+ daily requests with 99.97% uptime
• Collaborated in Agile sprints, consistently delivering features on schedule
• Optimised SQL queries reducing p95 response time by 65%

EDUCATION
B.Sc. Computer Science — State University, 2019

CERTIFICATIONS
AWS Certified Solutions Architect – Associate (2023)`,
    changes_made: [
      "Added quantified achievements (latency reduction, deploy time, uptime SLA)",
      "Rewrote summary to match job description language exactly",
      "Expanded technical skills section with all required keywords",
      "Restructured bullet points using action-verb + metric format",
      "Added CI/CD, Kubernetes, and AWS certifications from implied experience",
      "Removed generic phrases replaced with role-specific terminology",
    ],
    keywords_added: [
      "TypeScript",
      "CI/CD",
      "Docker",
      "Agile",
      "Kubernetes",
      "AWS",
      "Microservices",
      "GraphQL",
      "System Design",
    ],
    cover_letter: `Dear Hiring Manager,

I'm excited to apply for the Senior Software Engineer role. With six years building
production-grade microservices and REST APIs in Python and TypeScript, I bring exactly
the technical depth and delivery mindset your team needs.

At Acme Corp I architected 12 AWS-hosted microservices that cut end-to-end latency by
40%, and rebuilt our deployment pipeline with GitHub Actions CI/CD — shrinking release
cycles from two hours to under ten minutes. I'm comfortable owning a feature end-to-end:
from system design through Docker/Kubernetes deployment to post-launch monitoring.

What draws me to your company specifically is the charter to scale a platform that
directly impacts millions of users. I've navigated that exact inflection point before and
I know the tradeoffs involved in moving fast without accumulating fatal technical debt.

I'd welcome a conversation about how my background maps to your current roadmap. Thank
you for your consideration.

Warm regards,
Jane Doe`,
  });
}
