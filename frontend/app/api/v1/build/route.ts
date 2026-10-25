import { NextRequest, NextResponse } from "next/server";
import { aiNotConfigured, generateJSON, handleAIError } from "@/lib/ai-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { NO_FABRICATION_RULES, PLACEHOLDER_NOTE, stripInventedContacts } from "@/lib/prompt-rules";
import { verifyClaims, supports } from "@/lib/claim-guard";

// ─── POST /api/v1/build ───────────────────────────────────────────────────────
//
// Three actions driven by the `action` body field:
//   "analyze"   — read the JD and return role metadata + targeted questions
//   "write"     — take JD + answers → write full CV + score it
//

// "write" makes several sequential AI calls
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const notConfigured = aiNotConfigured();
    if (notConfigured) {
      return NextResponse.json({ detail: notConfigured }, { status: 500 });
    }

    const body = await req.json();
    const { action } = body;

    // Questionnaire answers + JD should comfortably fit; anything bigger is abuse
    if (JSON.stringify(body).length > 60_000) {
      return NextResponse.json({ detail: "Request too large." }, { status: 413 });
    }

    if (!action) {
      return NextResponse.json({ detail: "Missing action field." }, { status: 400 });
    }

    const limited = await rateLimit(req, action === "write" ? "ai" : "ai-light");
    if (limited) return limited;

    // ── Action: analyze ────────────────────────────────────────────────────────
    if (action === "analyze") {
      const job_description = String((body as { job_description?: unknown }).job_description ?? "").trim();
      if (job_description.length < 50) {
        return NextResponse.json({ detail: "Paste the job description (at least 50 characters)." }, { status: 400 });
      }
      if (job_description.length > 15_000) {
        return NextResponse.json({ detail: "Job description too long. Maximum is 15,000 characters." }, { status: 400 });
      }

      const res = await generateJSON(`You are a career expert. Analyze this job description and extract key information.

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
${job_description}`, { temperature: 0.3 });

      return NextResponse.json(res);
    }

    // ── Action: write ──────────────────────────────────────────────────────────
    if (action === "write") {
      const { job_description, answers, questions } = body as {
        job_description: string;
        answers: Record<string, string>;
        questions?: { id: string; section: string; question: string }[];
      };

      if (!job_description || !answers) {
        return NextResponse.json(
          { detail: "Missing job_description or answers." },
          { status: 400 }
        );
      }

      // Pair each answer with its question so the writer knows what it refers to
      const questionById = new Map((questions ?? []).map((q) => [q.id, q]));
      const answersText = Object.entries(answers)
        .filter(([, val]) => typeof val === "string" && val.trim().length > 0)
        .map(([id, val]) => {
          const q = questionById.get(id);
          return q ? `[${q.section}] ${q.question}\nAnswer: ${val}` : `${id}: ${val}`;
        })
        .join("\n\n");

      // Write the CV first; it is scored after refinement, on the final text
      const writeResult = await generateJSON(`You are an expert resume writer. Build a professional, ATS-optimised resume from the candidate's answers.

Rules:
- Write in clean single-column plain text — no tables, no columns, no graphics.
- Use clear section headers: CONTACT, SUMMARY, EXPERIENCE, EDUCATION, SKILLS
- Under EXPERIENCE, for each role write 3–5 bullet points.
  Every bullet should follow: [Strong Action Verb] + [Specific What You Did] + [Outcome].
  Example: "Increased checkout conversion by [X%] by redesigning the payment flow." (use the real figure if the answers give one).
- NEVER start a bullet with: 'Responsible for', 'Helped', 'Assisted', 'Worked on', 'Involved in', 'Participated in'.
- Each bullet must be one tight, punchy sentence — aim for 15–22 words.
- The SUMMARY should be 2–3 sentences tailored to the target role.
- Use the job description's wording for skills the candidate's answers show they have.
- Keep dates, titles, companies exactly as provided.

${NO_FABRICATION_RULES}

Return ONLY valid JSON:
{
  "resume": "<full CV as plain text>",
  "keywords_used": ["<keyword 1>", "<keyword 2>"]
}

JOB DESCRIPTION:
${job_description}

CANDIDATE ANSWERS:
${answersText}`, { temperature: 0.3 });

      const cv = writeResult as Record<string, unknown>;

      // Strip any leaked metadata from the resume text (GPT sometimes appends keywords_used)
      const resumeText = String(cv.resume ?? "")
        .replace(/\nkeywords_used\s*:[\s\S]*$/i, "")
        .trim();

      // Run assessment against the built CV + JD
      const assessmentResult = await generateJSON(`You are a brutally honest senior recruiter with 15+ years of experience. Assess this candidate's resume against the job description and give a frank, constructive shortlist assessment.

${PLACEHOLDER_NOTE}

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
${job_description}`, { temperature: 0.2 });

      const assessment = assessmentResult as Record<string, unknown>;

      // Step 3 — apply assessment fixes to produce the definitive final resume
      const quickWins = (assessment.quick_wins as string[])
        .map((w: string, i: number) => `${i + 1}. ${w}`)
        .join("\n");
      // Gaps are deliberately not passed to the rewriter (see optimize route): they stay in the review

      const refineResult = await generateJSON(`You are an expert resume writer. This resume has already been professionally written, but a recruiter assessment identified specific improvements. Apply ALL of them to produce the definitive final version.

IMPROVEMENTS TO APPLY (wording and structure only):
${quickWins}

Rules:
- Apply each quick win only as far as the existing content supports it. Skip any improvement that would need facts the resume does not contain.
- Skills the job asks for that the answers don't show are real gaps: never add them, or anything implying them.
- Keep any existing [placeholder] brackets so the candidate can fill them in.
- Every experience bullet should follow: [Strong Action Verb] + [Specific What You Did] + [Outcome].
- NEVER start a bullet with: 'Responsible for', 'Helped', 'Assisted', 'Worked on', 'Involved in'.
- Each bullet should be one tight sentence — aim for 15–22 words.
- Maintain clean single-column ATS formatting: clear section headers, no tables/columns.
- Keep all dates, job titles, and company names exactly as they are.

${NO_FABRICATION_RULES}

Return ONLY valid JSON:
{
  "refined_resume": "<full final resume as plain text>",
  "improvements_applied": ["<specific change made>", "<change>"]
}

CURRENT RESUME:
${resumeText}

JOB DESCRIPTION:
${job_description}`, { temperature: 0.3 });

      const refined = refineResult as Record<string, unknown>;
      const finalResume = ((refined.refined_resume as string) ?? resumeText)
        .replace(/\nkeywords_used\s*:[\s\S]*$/i, "")
        .trim();
      const heatmap = (assessment.skills_heatmap as { skill?: string }[] | undefined) ?? [];
      const gapTerms = heatmap.map((h) => h.skill ?? "").filter((t) => t && !supports(answersText, t));
      const { text: safeResume } = await verifyClaims(stripInventedContacts(finalResume, answersText), answersText, {
        gapTerms,
      });

      // Score the FINAL resume the user receives
      const scoreResult = await generateJSON(`You are an expert ATS resume analyst. Analyze this resume against the job description.

${PLACEHOLDER_NOTE}

Scoring criteria:
- keyword_coverage: how many of the JD's required keywords/skills appear in the resume
- skills_alignment: how well the candidate's experience matches the role's requirements
- formatting_compliance: ATS-friendliness (clean structure, no tables/columns, standard section headers)

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

RESUME:
${safeResume}`, { temperature: 0.1 });
      const score = scoreResult as Record<string, unknown>;

      return NextResponse.json({
        resume: safeResume,
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

      const res = await generateJSON(`You are a career coach helping a candidate complete their resume questionnaire.

Role: ${role_title} (${seniority}) in ${industry}
Section: ${section}
Question: ${question}
${contextLines ? `\nContext from other answers already given:\n${contextLines}\n` : ""}
Write a fill-in-the-blanks draft the candidate completes with their own facts.
Rules:
- Write in first person, using strong action verbs.
- Reuse any facts from the candidate's other answers.
- For every specific you do not know — numbers, tools, company or product names, dates, outcomes — use a short placeholder in square brackets, e.g. "[X%]", "[tool]", "[# people]". Never invent these details.
- Keep it concise: 2–4 sentences or 3 bullet points as appropriate.

Return ONLY valid JSON: { "suggestion": "<draft answer text>" }`, { temperature: 0.7 });

      return NextResponse.json(res);
    }

    return NextResponse.json({ detail: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    console.error("[build route]", err);
    const { message, status } = handleAIError(err);
    return NextResponse.json({ detail: message }, { status });
  }
}
