import { NextRequest, NextResponse } from "next/server";
import { aiNotConfigured, generateJSON, handleAIError } from "@/lib/ai-helpers";
import { verifyClaims } from "@/lib/claim-guard";
import { NO_FABRICATION_RULES, stripInventedContacts } from "@/lib/prompt-rules";
import { rateLimit } from "@/lib/rate-limit";

// POST /api/v1/export
// Body: { resume: string; format: "linkedin" | "wes" | "uk" }
// Returns: { formatted: string; sections?: Record<string, string> }

const FORMAT_PROMPTS: Record<string, string> = {
  linkedin: `You are a LinkedIn profile expert. Reformat this resume into LinkedIn-optimised copy that the candidate can paste directly into their profile.

Return ONLY valid JSON:
{
  "headline": "<compelling LinkedIn headline — role + value proposition, max 220 chars>",
  "about": "<LinkedIn About section — 3 paragraphs, first-person, narrative tone (not bullet points). Start with a hook about what drives you. Middle paragraph: career arc and key achievements with metrics. Final paragraph: what you're looking for + CTA like 'Open to opportunities in X — let's connect.'>",
  "experience": [
    {
      "title": "<job title>",
      "company": "<company>",
      "period": "<date range>",
      "description": "<LinkedIn-style description — 3–5 bullets using • as prefix, action verb first, metrics included>"
    }
  ],
  "skills": ["<skill 1>", "<skill 2>"],
  "recommendation_requests": [
    {
      "target": "<name or role of person to ask, e.g. 'Your manager at [Company]'>",
      "template": "<a polite, specific message the candidate can send to request a LinkedIn recommendation — mention the project or achievement you'd like them to speak to>"
    }
  ],
  "formatted": "<full formatted copy ready to copy-paste, with clear section labels>"
}

Rules:
- LinkedIn About: conversational but professional, narrative style. NO generic opener like 'I am a passionate...'. NO bullet points in the About — use flowing paragraphs.
- Headline: include role + differentiator (e.g. 'Senior Product Manager | Scaling B2B SaaS from 0→1 | ex-Google').
- Skills: top 10 most relevant, ordered by importance for LinkedIn's skills section. Put the most searchable/in-demand skills first.
- recommendation_requests: generate 2–3 templates targeting different roles (manager, peer, client) based on the resume's experience. Each template should reference a specific achievement or project.
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
- Education section must list: degree name, institution, country, dates attended (Month Year – Month Year), graduation date. Include GPA, honours, or class of degree if present in the resume.
- Work experience must include: full company name, city/country, exact start and end dates (Month Year – Month Year format).
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
- Work experience: reverse chronological. Include company, role, dates (DD Month YYYY or Month YYYY format), and 3–5 bullet points per role.
- Education: degree class if applicable (e.g. '2:1 BSc Computer Science').
- 'Hobbies & Interests' section: include ONLY if hobbies or interests are explicitly mentioned in the resume. If none are present, omit this section entirely — do NOT fabricate or infer hobbies.
- End with: 'References available upon request.'
- Do NOT include photo, age, marital status, or nationality (UK Equality Act).
- Aim for 2 pages. Be concise.
- Do NOT fabricate credentials or experience.`,
};

export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimit(req, "ai-light");
    if (limited) return limited;

    const notConfigured = aiNotConfigured();
    if (notConfigured) {
      return NextResponse.json({ detail: notConfigured }, { status: 500 });
    }

    const { resume, format } = await req.json() as { resume: string; format: string };

    if (!resume?.trim()) {
      return NextResponse.json({ detail: "Missing resume text." }, { status: 400 });
    }
    if (resume.length > 50_000) {
      return NextResponse.json({ detail: "Resume text too long. Maximum is 50,000 characters." }, { status: 400 });
    }
    if (!FORMAT_PROMPTS[format]) {
      return NextResponse.json({ detail: `Unknown format: ${format}` }, { status: 400 });
    }

    const res = (await generateJSON(
      `${FORMAT_PROMPTS[format]}\n\nReformat only. A new format is no reason to add claims: no new strengths, traits, results or goals the resume doesn't state.\n\n${NO_FABRICATION_RULES}\n\nRESUME:\n${resume}`,
      { temperature: 0.3 }
    )) as Record<string, unknown>;

    // Same honesty check as the resume itself
    if (typeof res.formatted === "string") {
      res.formatted = (await verifyClaims(stripInventedContacts(res.formatted, resume), resume, { kind: "profile" })).text;
    }
    return NextResponse.json(res);
  } catch (err: unknown) {
    console.error("[export route]", err);
    const { message, status } = handleAIError(err);
    return NextResponse.json({ detail: message }, { status });
  }
}
