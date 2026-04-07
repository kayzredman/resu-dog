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
- Under EXPERIENCE, for each role write 3–5 strong bullet points using action verbs + quantified impact.
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

      return NextResponse.json({
        resume: cv.resume ?? "",
        keywords_used: cv.keywords_used ?? [],
        score,
      });
    }

    return NextResponse.json({ detail: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error";
    console.error("[build route]", err);
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
