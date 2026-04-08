import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// POST /api/v1/export
// Body: { resume: string; format: "linkedin" | "wes" | "uk" }
// Returns: { formatted: string; sections?: Record<string, string> }

const FORMAT_PROMPTS: Record<string, string> = {
  linkedin: `You are a LinkedIn profile expert. Reformat this resume into LinkedIn-optimised copy that the candidate can paste directly into their profile.

Return ONLY valid JSON:
{
  "headline": "<compelling LinkedIn headline — role + value proposition, max 220 chars>",
  "about": "<LinkedIn About section — 3 paragraphs, first-person, ends with a CTA like 'Open to opportunities in X'>",
  "experience": [
    {
      "title": "<job title>",
      "company": "<company>",
      "period": "<date range>",
      "description": "<LinkedIn-style description — 3–5 bullets using • as prefix, action verb first, metrics included>"
    }
  ],
  "skills": ["<skill 1>", "<skill 2>"],
  "formatted": "<full formatted copy ready to copy-paste, with clear section labels>"
}

Rules:
- LinkedIn About: conversational but professional. NO generic opener like 'I am a passionate...'.
- Headline: include role + differentiator (e.g. 'Senior Product Manager | Scaling B2B SaaS from 0→1 | ex-Google').
- Skills: top 10 most relevant for LinkedIn's skills section.
- Do NOT fabricate any experience or credentials.`,

  wes: `You are an expert in Canadian immigration and WES (World Education Services) credential recognition. Reformat this resume into the standard format expected for Canadian immigration and WES credential evaluation applications.

Return ONLY valid JSON:
{
  "formatted": "<full reformatted CV as plain text>",
  "notes": ["<important note for WES submission>", "<note>"]
}

Canadian/WES CV rules to apply:
- Use the heading 'CURRICULUM VITAE' instead of 'RESUME'.
- Include full contact details at the top (address, phone, email).
- Education section must list: degree name, institution, country, dates attended, graduation date.
- Work experience must include: full company name, city/country, exact start and end dates (Month Year format).
- Include a 'Languages' section if applicable.
- Include 'References available upon request' at the end.
- Do NOT include a photo or date of birth (Canadian human rights).
- Format: clean plain text, no tables/columns, standard section headers.
- Do NOT fabricate anything.`,

  uk: `You are a UK/EU CV expert. Reformat this resume into a standard UK CV format.

Return ONLY valid JSON:
{
  "formatted": "<full reformatted UK CV as plain text>",
  "notes": ["<UK-specific formatting note>"]
}

UK CV rules to apply:
- Heading: just the candidate's name (large) — no 'CV' or 'Resume' label needed.
- Personal statement (not 'Summary'): 4–5 sentences, third-person or first-person, role-specific.
- Work experience: reverse chronological. Include company, role, dates, and 3–5 bullet points per role.
- Education: degree class if applicable (e.g. '2:1 BSc Computer Science').
- Add a 'Hobbies & Interests' section at the end (infer 1–2 tasteful interests if not present, e.g. 'Reading' or 'Running').
- End with: 'References available upon request.'
- Do NOT include photo, age, marital status, or nationality (UK Equality Act).
- Aim for 2 pages. Be concise.
- Do NOT fabricate credentials or experience.`,
};

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ detail: "OPENAI_API_KEY is not set." }, { status: 500 });
    }

    const { resume, format } = await req.json() as { resume: string; format: string };

    if (!resume?.trim()) {
      return NextResponse.json({ detail: "Missing resume text." }, { status: 400 });
    }
    if (!FORMAT_PROMPTS[format]) {
      return NextResponse.json({ detail: `Unknown format: ${format}` }, { status: 400 });
    }

    const client = new OpenAI({ apiKey });

    const res = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: `${FORMAT_PROMPTS[format]}\n\nRESUME:\n${resume}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    return NextResponse.json(JSON.parse(res.choices[0].message.content!));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error";
    console.error("[export route]", err);
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
