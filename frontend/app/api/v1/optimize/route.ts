import { NextRequest, NextResponse } from "next/server";
import { aiNotConfigured, generateJSON, handleAIError } from "@/lib/ai-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { NO_FABRICATION_RULES, PLACEHOLDER_NOTE, PLACEHOLDER_PATTERN, stripInventedContacts } from "@/lib/prompt-rules";
import { verifyClaims, hasTerm, supports } from "@/lib/claim-guard";

// The full pipeline makes several sequential AI calls
export const maxDuration = 300;

// ─── Limits ───────────────────────────────────────────────────────────────────
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_RESUME_CHARS = 50_000;
const MAX_JD_CHARS = 15_000;
const MIN_JD_CHARS = 50;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

// ─── File text extraction ─────────────────────────────────────────────────────

/** The browser-reported MIME type can be spoofed, so check the file's leading bytes too. */
function matchesSignature(type: string, buffer: Buffer): boolean {
  if (type === "application/pdf") return buffer.subarray(0, 5).toString("latin1") === "%PDF-";
  // DOCX is a ZIP container: "PK\x03\x04"
  if (type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
  }
  // Plain text must not contain NUL bytes (a cheap binary-file check)
  if (type === "text/plain") return !buffer.subarray(0, 8192).includes(0);
  return false;
}

class FileReadError extends Error {}

async function extractText(file: File): Promise<string> {
  const type = file.type;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (!matchesSignature(type, buffer)) {
    throw new FileReadError("This file doesn't look like a real PDF, DOCX or TXT. Try exporting it again.");
  }

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

// ─── AI calls ─────────────────────────────────────────────────────────────────

async function optimizeResume(
  resumeText: string,
  jobDescription: string
) {
  const res = await generateJSON(`You are an expert resume writer and ATS optimization specialist.

Your task: Rewrite the resume to maximize ATS compatibility with the job description.

Rules:
- Every experience bullet should follow: [Strong Action Verb] + [Specific What You Did] + [Outcome].
  Example: "Cut deployment time by 40% by migrating the CI pipeline to GitHub Actions." (only if the 40% is in the original — otherwise "by [X%]").
- NEVER start a bullet with: 'Responsible for', 'Helped', 'Assisted', 'Worked on', 'Involved in', 'Participated in', 'Contributed to'.
- Each bullet must be one tight sentence — aim for 15–22 words.
- Use the job description's wording for skills and experience the candidate genuinely has.
- Keep all dates, job titles, and company names exactly as they are.
- Remove tables, columns, headers/footers — use clean single-column plain text.
- Format for ATS: clear section headers (EXPERIENCE, EDUCATION, SKILLS, etc.)

${NO_FABRICATION_RULES}

Return ONLY valid JSON with this exact structure:
{
  "optimized_resume": "<full rewritten resume as plain text>",
  "changes_made": ["<change 1>", "<change 2>"],
  "keywords_added": ["<JD keyword now used for a skill the original already showed>"]
}

ORIGINAL RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}`, { temperature: 0.3 });
  return res;
}

async function scoreResume(
  resumeText: string,
  jobDescription: string
) {
  const res = await generateJSON(`You are an expert ATS resume analyst. Analyze the resume against the job description.

${PLACEHOLDER_NOTE}

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
${jobDescription}`, { temperature: 0.1 });
  return res;
}

// ─── Deterministic keyword coverage ──────────────────────────────────────────
//
// The model's keyword judgement varies run to run. To make before/after comparable and
// explainable, we take the keyword list the model found in the JD once, then check both
// resumes against that same list in code.

type Score = Record<string, unknown>;

function hasKeyword(text: string, keyword: string): boolean {
  const escaped = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!escaped) return false;
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, "i").test(text);
}

function applyKeywordCoverage(score: Score, text: string, universe: string[]): Score {
  if (universe.length === 0) return score;
  const matched = universe.filter((k) => hasKeyword(text, k));
  const missing = universe.filter((k) => !hasKeyword(text, k));
  const keywordCoverage = Math.round((matched.length / universe.length) * 100);
  const skills = Number(score.skills_alignment) || 0;
  const formatting = Number(score.formatting_compliance) || 0;
  return {
    ...score,
    keyword_coverage: keywordCoverage,
    matched_keywords: matched,
    missing_keywords: missing,
    overall_score: Math.round((keywordCoverage + skills + formatting) / 3),
  };
}

function keywordUniverse(score: Score): string[] {
  const all = [
    ...((score.matched_keywords as string[]) ?? []),
    ...((score.missing_keywords as string[]) ?? []),
  ].filter((k) => typeof k === "string" && k.trim().length > 0);
  const seen = new Set<string>();
  return all.filter((k) => {
    const key = k.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** General mode: the overall score is the plain average of the four sub-scores, computed here. */
function withQualityAverage(score: Score): Score {
  const parts = [score.clarity, score.action_language, score.structure, score.completeness].map(Number);
  if (parts.some((n) => !Number.isFinite(n))) return score;
  return { ...score, overall_score: Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) };
}

/**
 * Drops "changes made" entries that describe claims the guard removed, and any that talk
 * about [placeholders] when the final resume has none left.
 */
function withoutRemoved(changes: string[], removed: string[], finalResume: string): string[] {
  const hasPlaceholders = (finalResume.match(PLACEHOLDER_PATTERN) ?? []).length > 0;
  return changes.filter(
    (c) =>
      !removed.some((t) => hasTerm(c, t)) &&
      (hasPlaceholders || !mentionsPlaceholders(c))
  );
}

const mentionsPlaceholders = (t: string) => /placeholder|bracket|\[[^\]]*\]/i.test(t);

/**
 * The assessment reviews the draft before the final rewrite. If the final resume has no
 * [placeholders] left, drop the advice that's about them, so we never mention brackets the
 * user can't see.
 */
function withoutStalePlaceholderAdvice(assessment: unknown, finalResume: string): unknown {
  if (!assessment || typeof assessment !== "object") return assessment;
  if ((finalResume.match(PLACEHOLDER_PATTERN) ?? []).length > 0) return assessment;
  const a = { ...(assessment as Record<string, unknown>) };
  for (const key of ["critical_gaps", "quick_wins", "red_flags", "strengths"]) {
    if (Array.isArray(a[key])) a[key] = (a[key] as unknown[]).filter((x) => typeof x !== "string" || !mentionsPlaceholders(x));
  }
  if (typeof a.probability_rationale === "string" && mentionsPlaceholders(a.probability_rationale)) {
    // Keep the sentences that don't mention them
    a.probability_rationale = (a.probability_rationale as string)
      .split(/(?<=[.!?])\s+/)
      .filter((sentence) => !mentionsPlaceholders(sentence))
      .join(" ");
  }
  return a;
}

// ─── Shortlist assessment ─────────────────────────────────────────────────────

async function assessResume(
  optimizedResume: string,
  jobDescription: string | null,
  mode: "targeted" | "general"
) {
  const isTargeted = mode === "targeted" && jobDescription;

  const prompt = isTargeted
    ? `You are a brutally honest senior recruiter with 15+ years of experience. Assess this candidate's resume against the job description and give a frank, constructive shortlist assessment.

${PLACEHOLDER_NOTE}

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

${PLACEHOLDER_NOTE}

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

  const res = await generateJSON(prompt, { temperature: 0.2 });
  return res;
}

async function generateCoverLetter(
  optimizedResume: string,
  jobDescription: string
) {
  const res = await generateJSON(`You are an expert career coach and professional writer.

Write a compelling, personalized cover letter based on the candidate's experience and the JD.

Rules:
- Begin with "Dear Hiring Manager," as the salutation (industry standard — recruiters expect it).
- Write in first person, professional but engaging tone.
- Connect specific experiences from the resume to specific requirements in the JD.
- Do NOT use generic filler phrases like "I am a hard worker" or "team player".
- 3-4 paragraphs maximum.
- End with a professional sign-off: "Sincerely," followed by the candidate's full name on the next line.
- Only mention experience, skills and results that appear in the resume. If the resume contains [placeholder] brackets, keep them as-is rather than inventing the value.

Return ONLY valid JSON: { "cover_letter": "<full cover letter text>" }

CANDIDATE RESUME:
${optimizedResume}

JOB DESCRIPTION:
${jobDescription}`, { temperature: 0.5 });
  return res;
}

// ─── General mode (no JD) functions ─────────────────────────────────────────

// ─── Assessment-driven refinement ────────────────────────────────────────────

async function refineWithAssessment(
  optimizedResume: string,
  assessment: Record<string, unknown>,
  jobDescription: string | null
) {
  const quickWins = (assessment.quick_wins as string[])
    .map((w, i) => `${i + 1}. ${w}`)
    .join("\n");
  // Critical gaps are deliberately NOT passed to the rewriter: a real gap can't be fixed by
  // rewording, and asking to "address" it invited invented experience. Gaps stay in the review.
  const jdSection = jobDescription
    ? `\nJOB DESCRIPTION (for keyword context):\n${jobDescription}`
    : "";

  const res = await generateJSON(`You are an expert resume writer. This resume has already been ATS-optimized, but a recruiter assessment identified specific improvements. Apply ALL of them to produce the definitive final version.

IMPROVEMENTS TO APPLY (wording and structure only):
${quickWins}

Rules:
- Apply each quick win only as far as the existing content supports it. Skip any improvement that would need facts the resume does not contain.
- Skills the job asks for that the resume doesn't show are real gaps: never add them, or anything implying them.
- Keep any existing [placeholder] brackets so the candidate can fill them in.
- Every experience bullet should follow: [Strong Action Verb] + [Specific What You Did] + [Outcome].
- NEVER start a bullet with: 'Responsible for', 'Helped', 'Assisted', 'Worked on', 'Involved in'.
- Each bullet should be one tight sentence — 15–22 words.
- Maintain clean single-column ATS formatting: clear section headers, no tables/columns.
- Keep all dates, job titles, and company names exactly as they are.
- The result should be the strongest possible honest version of this resume.

${NO_FABRICATION_RULES}

Return ONLY valid JSON:
{
  "refined_resume": "<full final resume as plain text>",
  "improvements_applied": ["<specific change made>", "<change>"],
  "skipped": ["<suggestion not applied because it needs facts the resume lacks>"]
}

CURRENT OPTIMIZED RESUME:
${optimizedResume}${jdSection}`, { temperature: 0.3 });
  return res;
}


async function optimizeResumeGeneral(resumeText: string) {
  const res = await generateJSON(`You are an expert resume writer. Improve this resume for general quality — clarity, action language, structure, and completeness.

Rules:
- Every experience bullet should follow: [Strong Action Verb] + [Specific What You Did] + [Outcome].
  Example: "Cut support resolution time by [X%] by building an internal knowledge-base tool."
- NEVER start a bullet with: 'Responsible for', 'Helped', 'Assisted', 'Worked on', 'Involved in', 'Participated in'.
- Each bullet must be one tight sentence — aim for 15–22 words.
- Improve structure and section ordering for readability.
- Remove tables, columns, graphics — use clean single-column plain text.
- Use clear section headers (EXPERIENCE, EDUCATION, SKILLS, SUMMARY, etc.)
- Keep all dates, job titles, and company names exactly as they are.

${NO_FABRICATION_RULES}

Return ONLY valid JSON:
{
  "optimized_resume": "<full rewritten resume as plain text>",
  "changes_made": ["<change 1>", "<change 2>"]
}

RESUME:
${resumeText}`, { temperature: 0.3 });
  return res;
}

async function scoreResumeGeneral(resumeText: string) {
  const res = await generateJSON(`You are an expert resume coach. Evaluate this resume on general quality — not for a specific job.

${PLACEHOLDER_NOTE}

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
${resumeText}`, { temperature: 0.1 });
  return res;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const notConfigured = aiNotConfigured();
    if (notConfigured) {
      return NextResponse.json({ detail: notConfigured }, { status: 500 });
    }

    const limited = await rateLimit(req, "ai");
    if (limited) return limited;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    // Trimmed; ignored entirely in general (Just polish) mode
    const rawJobDescription = ((formData.get("job_description") as string | null) ?? "").trim();
    const mode = (formData.get("mode") as string | null) ?? "targeted";
    if (mode !== "targeted" && mode !== "general") {
      return NextResponse.json({ detail: "Unknown mode." }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json(
        { detail: "Missing resume file." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { detail: "Unsupported file type. Please upload a PDF, DOCX, or TXT file." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { detail: "File too large. Maximum size is 10 MB." },
        { status: 400 }
      );
    }

    const jobDescription = mode === "targeted" ? rawJobDescription : null;

    if (mode === "targeted" && (jobDescription ?? "").length < MIN_JD_CHARS) {
      return NextResponse.json(
        { detail: `Paste the job description (at least ${MIN_JD_CHARS} characters) to match against a job, or choose Just polish.` },
        { status: 400 }
      );
    }

    if (jobDescription && jobDescription.length > MAX_JD_CHARS) {
      return NextResponse.json(
        { detail: `Job description too long. Maximum is ${MAX_JD_CHARS.toLocaleString()} characters.` },
        { status: 400 }
      );
    }

    let resumeText: string;
    try {
      resumeText = await extractText(file);
    } catch (err) {
      console.error("[optimize route] extract", err);
      return NextResponse.json(
        {
          detail:
            err instanceof FileReadError
              ? err.message
              : "We couldn't read this file. Try saving it again as a PDF or DOCX.",
        },
        { status: 422 }
      );
    }

    if (resumeText.trim().length < 50) {
      return NextResponse.json(
        { detail: "Could not extract enough text from the uploaded file." },
        { status: 422 }
      );
    }

    if (resumeText.length > MAX_RESUME_CHARS) {
      return NextResponse.json(
        { detail: `Resume text too long (${resumeText.length.toLocaleString()} chars). Maximum is ${MAX_RESUME_CHARS.toLocaleString()}.` },
        { status: 400 }
      );
    }

    if (mode === "general") {
      // General mode: no JD — score + optimize independently, no cover letter
      const [scoreBefore, optimizeResult] = await Promise.all([
        scoreResumeGeneral(resumeText),
        optimizeResumeGeneral(resumeText),
      ]);

      const optResult = optimizeResult as Record<string, unknown>;

      const assessment = await assessResume(optResult.optimized_resume as string, null, "general");

      // Step 3 — apply assessment fixes to produce the final polished resume
      const refineResult = await refineWithAssessment(
        optResult.optimized_resume as string,
        assessment as Record<string, unknown>,
        null
      );

      const refResult = refineResult as Record<string, unknown>;
      const { text: finalResume, removed } = await verifyClaims(
        stripInventedContacts((refResult.refined_resume as string) ?? (optResult.optimized_resume as string), resumeText),
        resumeText
      );

      // Score the FINAL resume the user receives
      const scoreAfter = withQualityAverage((await scoreResumeGeneral(finalResume)) as Score);

      return NextResponse.json({
        mode: "general",
        score_before: withQualityAverage(scoreBefore as Score),
        score_after: scoreAfter,
        optimized_resume: finalResume,
        changes_made: withoutRemoved(
          [...((optResult.changes_made as string[]) ?? []), ...((refResult.improvements_applied as string[]) ?? [])],
          removed,
          finalResume
        ),
        keywords_added: [],
        cover_letter: "",
        assessment: withoutStalePlaceholderAdvice(assessment, finalResume),
      });
    }

    // Targeted mode
    // Step 1 — score original + optimize in parallel (both only need original text + JD)
    const [scoreBeforeRaw, optimizeRaw] = await Promise.all([
      scoreResume(resumeText, jobDescription!),
      optimizeResume(resumeText, jobDescription!),
    ]);

    const optTargeted = optimizeRaw as Record<string, unknown>;

    // Step 2 — recruiter assessment of the optimized draft
    const assessment = await assessResume(
      optTargeted.optimized_resume as string,
      jobDescription!,
      "targeted"
    );

    // Step 3 — apply the assessment's fixes to produce the final resume
    const refTargeted = (await refineWithAssessment(
      optTargeted.optimized_resume as string,
      assessment as Record<string, unknown>,
      jobDescription!
    )) as Record<string, unknown>;

    // Job skills the candidate doesn't have: these must never appear as claims
    const universe = keywordUniverse(scoreBeforeRaw as Score);
    const heatmap = ((assessment as Record<string, unknown>).skills_heatmap as { skill?: string }[] | undefined) ?? [];
    const gapTerms = [...universe, ...heatmap.map((h) => h.skill ?? "")].filter((t) => t && !supports(resumeText, t));

    const { text: finalResume, removed } = await verifyClaims(
      stripInventedContacts((refTargeted.refined_resume as string) ?? (optTargeted.optimized_resume as string), resumeText),
      resumeText,
      { gapTerms }
    );

    // Step 4 — score and write the cover letter from the FINAL resume the user receives
    const [scoreAfterRaw, coverResult] = await Promise.all([
      scoreResume(finalResume, jobDescription!),
      generateCoverLetter(finalResume, jobDescription!),
    ]);

    // The letter may name the company and role (from the job ad) but not skills the resume lacks
    const { text: coverLetter } = await verifyClaims(
      String((coverResult as Record<string, unknown>).cover_letter ?? ""),
      `${finalResume}\n${jobDescription}`,
      { gapTerms, kind: "cover letter", factSource: finalResume }
    );

    // Same keyword list for both scores, checked in code
    const scoreBefore = applyKeywordCoverage(scoreBeforeRaw as Score, resumeText, universe);
    const scoreAfter = applyKeywordCoverage(scoreAfterRaw as Score, finalResume, universe);

    return NextResponse.json({
      mode: "targeted",
      score_before: scoreBefore,
      score_after: scoreAfter,
      optimized_resume: finalResume,
      changes_made: withoutRemoved(
        [...((optTargeted.changes_made as string[]) ?? []), ...((refTargeted.improvements_applied as string[]) ?? [])],
        removed,
        finalResume
      ),
      // Only keywords the candidate genuinely has
      keywords_added: ((optTargeted.keywords_added as string[]) ?? []).filter((k) => supports(resumeText, k)),
      cover_letter: coverLetter,
      assessment: withoutStalePlaceholderAdvice(assessment, finalResume),
    });
  } catch (err: unknown) {
    console.error("[optimize route]", err);
    const { message, status } = handleAIError(err);
    return NextResponse.json({ detail: message }, { status });
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
