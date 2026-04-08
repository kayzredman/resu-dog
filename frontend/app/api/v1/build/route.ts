import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// ─── POST /api/v1/build ───────────────────────────────────────────────────────
//
// Three actions driven by the `action` body field:
//   "analyze"   — read the JD and return role metadata + targeted questions
//   "write"     — take JD + answers → write full CV + score it
//

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { detail: "OPENAI_API_KEY is not set. Add it to .env.local." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ detail: "Missing action field." }, { status: 400 });
    }

    const client = new OpenAI({ apiKey });

    // ── Action: analyze ────────────────────────────────────────────────────────
    if (action === "analyze") {
      const { job_description } = body as { job_description: string };
      if (!job_description) {
        return NextResponse.json({ detail: "Missing job_description." }, { status: 400 });
      }

      const res = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: `You are a career expert. Analyze this job description and extract key information.

Return ONLY valid JSON:
{
  "role_title": "<job title from the JD>",
  "seniority": "<Junior | Mid | Senior | Lead | Director | Executive>",
  "industry": "<industry / domain>",
  "key_skills": ["<skill 1>", "<skill 2>"],
  "questions": [
    {
      "id": "q1",
      "section": "<Personal Info | Work Experience | Education | Skills | Achievements>",
      "question": "<targeted question relevant to THIS specific role>",
      "placeholder": "<example answer>",
      "required": true
    }
  ]
}

Question guidelines:
- Generate 12–16 questions total, spread across all sections.
- Personal Info section: Full name, email, phone, location, LinkedIn URL (optional).
- Work Experience: Ask for most recent 2–3 roles. For each, ask: company name, job title, dates, and key achievements (tailored to what this role values — e.g. for engineering roles ask about systems built; for management ask about team sizes / budget).
- Education: Degree, institution, graduation year.
- Skills: Ask specifically about skills mentioned in the JD.
- Achievements: One question about a specific accomplishment directly relevant to this role.
- Questions should feel like a smart recruiter wrote them for THIS job — not generic.

JOB DESCRIPTION:
${job_description}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      return NextResponse.json(JSON.parse(res.choices[0].message.content!));
    }

    // ── Action: write ──────────────────────────────────────────────────────────
    if (action === "write") {
      const { job_description, answers } = body as {
        job_description: string;
        answers: Record<string, string>;
      };

      if (!job_description || !answers) {
        return NextResponse.json(
          { detail: "Missing job_description or answers." },
          { status: 400 }
        );
      }

      const answersText = Object.entries(answers)
        .map(([id, val]) => `${id}: ${val}`)
        .join("\n");

      // Write CV + score in parallel
      const [writeResult, scoreResult] = await Promise.all([
        client.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: `You are an expert resume writer. Build a professional, ATS-optimised resume from the candidate's answers.

Rules:
- Use ONLY the information provided in the answers. Do NOT fabricate anything.
- Write in clean single-column plain text — no tables, no columns, no graphics.
- Use clear section headers: CONTACT, SUMMARY, EXPERIENCE, EDUCATION, SKILLS
- Under EXPERIENCE, for each role write 3–5 bullet points.
  Every bullet MUST follow: [Strong Action Verb] + [Specific What You Did] + [Measurable Outcome].
  Example: "Increased e-commerce conversion rate by 18% by redesigning the checkout flow."
  If the candidate's answer lacks a metric, infer a credible one from the role context.
- NEVER start a bullet with: 'Responsible for', 'Helped', 'Assisted', 'Worked on', 'Involved in', 'Participated in'.
- Each bullet must be one tight, punchy sentence — aim for 15–22 words.
- The SUMMARY should be 2–3 sentences tailored to the target role.
- Naturally incorporate keywords from the job description.
- Keep dates, titles, companies exactly as provided.

Return ONLY valid JSON:
{
  "resume": "<full CV as plain text>",
  "keywords_used": ["<keyword 1>", "<keyword 2>"]
}

JOB DESCRIPTION:
${job_description}

CANDIDATE ANSWERS:
${answersText}`,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
        }),
        client.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: `You are an expert ATS resume analyst. Based on the candidate's answers and the job description, predict the ATS score for the resume that will be written.

Scoring criteria:
- keyword_coverage: how many of the JD's required keywords/skills the candidate likely has
- skills_alignment: how well the candidate's experience matches the role's requirements
- formatting_compliance: assume the CV will be clean plain text (score 90+)

Rules:
- Do NOT penalise for not mentioning the target company's name.
- Do NOT penalise for lack of cover letter.
- Be precise and meaningful.

Return ONLY valid JSON:
{
  "overall_score": <integer 0-100>,
  "keyword_coverage": <integer 0-100>,
  "skills_alignment": <integer 0-100>,
  "formatting_compliance": <integer 0-100>,
  "matched_keywords": ["<keyword>"],
  "missing_keywords": ["<keyword>"],
  "summary": "<one sentence ATS match summary>"
}

JOB DESCRIPTION:
${job_description}

CANDIDATE ANSWERS:
${answersText}`,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
        }),
      ]);

      const cv = JSON.parse(writeResult.choices[0].message.content!);
      const score = JSON.parse(scoreResult.choices[0].message.content!);

      // Strip any leaked metadata from the resume text (GPT sometimes appends keywords_used)
      const resumeText = (cv.resume ?? "")
        .replace(/\nkeywords_used\s*:[\s\S]*$/i, "")
        .trim();

      // Run assessment against the built CV + JD
      const assessmentResult = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: `You are a brutally honest senior recruiter with 15+ years of experience. Assess this candidate's resume against the job description and give a frank, constructive shortlist assessment.

Be specific. Reference actual content from the resume. Do NOT give generic advice.

Return ONLY valid JSON:
{
  "shortlist_probability": "<Low | Fair | Good | Strong>",
  "probability_rationale": "<one sentence explaining the verdict>",
  "strengths": ["<specific strength from the resume>", "<specific strength>", "<specific strength>"],
  "critical_gaps": ["<specific gap or mismatch vs the JD>"],
  "quick_wins": ["<one concrete actionable change>", "<change>", "<change>"],
  "red_flags": ["<recruiter concern>"],
  "skills_heatmap": [
    { "skill": "<JD skill name>", "status": "<matched | transferable | gap>" }
  ],
  "transferable_bridges": [
    { "skill": "<skill name>", "bridge": "<one honest sentence mapping existing experience to this requirement>" }
  ],
  "gap_roadmap": [
    { "skill": "<skill name>", "action": "<specific cert / project / course to close this gap — name it explicitly>" }
  ]
}

Rules:
- strengths: 2–4 items. Quote or reference specific content.
- critical_gaps: 1–4 items. Real gaps only. If none, return [].
- quick_wins: exactly 3 doable actions the candidate can do right now.
- red_flags: 0–3 genuine concerns. If none, return [].
- skills_heatmap: list EVERY skill/tool/technology mentioned in the JD. Status: "matched" = clearly present, "transferable" = not exact but adjacent experience exists, "gap" = genuinely missing.
- transferable_bridges: ONLY skills with status "transferable". One honest sentence each.
- gap_roadmap: ONLY skills with status "gap". Name a specific cert, course, or project (e.g. "Complete the Google Project Management cert on Coursera — 6 months part-time").

RESUME:
${resumeText}

JOB DESCRIPTION:
${job_description}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      });

      const assessment = JSON.parse(assessmentResult.choices[0].message.content!);

      // Step 3 — apply assessment fixes to produce the definitive final resume
      const quickWins = (assessment.quick_wins as string[])
        .map((w: string, i: number) => `${i + 1}. ${w}`)
        .join("\n");
      const gaps = ((assessment.critical_gaps as string[]) ?? [])
        .map((g: string) => `- ${g}`)
        .join("\n");

      const refineResult = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: `You are an expert resume writer. This resume has already been professionally written, but a recruiter assessment identified specific improvements. Apply ALL of them to produce the definitive final version.

IMPROVEMENTS TO APPLY:
${gaps ? `Critical gaps to address:\n${gaps}\n` : ""}
Quick wins to implement:
${quickWins}

Rules:
- Apply EVERY quick win and address EVERY critical gap where possible.
- Do NOT fabricate experience, companies, dates, or qualifications not in the original.
- Every experience bullet MUST follow: [Strong Action Verb] + [Specific What You Did] + [Measurable Outcome].
  If no exact metric exists, infer a credible one from context.
- NEVER start a bullet with: 'Responsible for', 'Helped', 'Assisted', 'Worked on', 'Involved in'.
- Each bullet should be one tight sentence — aim for 15–22 words.
- Maintain clean single-column ATS formatting: clear section headers, no tables/columns.
- Keep all dates, job titles, and company names exactly as they are.

Return ONLY valid JSON:
{
  "refined_resume": "<full final resume as plain text>",
  "improvements_applied": ["<specific change made>", "<change>"]
}

CURRENT RESUME:
${resumeText}

JOB DESCRIPTION:
${job_description}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const refined = JSON.parse(refineResult.choices[0].message.content!);
      const finalResume = (refined.refined_resume ?? resumeText)
        .replace(/\nkeywords_used\s*:[\s\S]*$/i, "")
        .trim();

      return NextResponse.json({
        resume: finalResume,
        keywords_used: cv.keywords_used ?? [],
        score,
        assessment,
        improvements_applied: refined.improvements_applied ?? [],
      });
    }

    // ── Action: assist ──────────────────────────────────────────────────────
    if (action === "assist") {
      const { role_title, seniority, industry, section, question, existing_answers } = body as {
        role_title: string;
        seniority: string;
        industry: string;
        section: string;
        question: string;
        existing_answers?: Record<string, string>;
      };

      const contextLines = existing_answers
        ? Object.entries(existing_answers)
            .filter(([, v]) => v.trim().length > 0)
            .map(([k, v]) => `${k}: ${v}`)
            .join("\n")
        : "";

      const res = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: `You are a career coach helping a candidate complete their resume questionnaire.

Role: ${role_title} (${seniority}) in ${industry}
Section: ${section}
Question: ${question}
${contextLines ? `\nContext from other answers already given:\n${contextLines}\n` : ""}
Write a realistic, specific draft answer the candidate can use as a starting point.
Rules:
- Write in first person.
- Be concrete — use real-sounding examples relevant to this specific role and industry.
- Keep it concise: 2–4 sentences or 3 bullet points as appropriate.
- Use strong action verbs and include numbers/metrics where natural.
- This is a draft for the candidate to personalise — avoid made-up proper nouns.

Return ONLY valid JSON: { "suggestion": "<draft answer text>" }`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      return NextResponse.json(JSON.parse(res.choices[0].message.content!));
    }

    return NextResponse.json({ detail: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error";
    console.error("[build route]", err);
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
