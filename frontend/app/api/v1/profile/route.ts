import { NextRequest, NextResponse } from "next/server";
import { aiNotConfigured, generateJSON, handleAIError } from "@/lib/ai-helpers";
import { verifyClaims } from "@/lib/claim-guard";
import { requirePro } from "@/lib/entitlements";
import { NO_FABRICATION_RULES, stripInventedContacts } from "@/lib/prompt-rules";
import { rateLimit } from "@/lib/rate-limit";

// POST /api/v1/profile
// Body: { resume: string }
// Returns: ProfileData JSON

export async function POST(req: NextRequest) {
  try {
    const locked = requirePro();
    if (locked) return locked;

    const limited = await rateLimit(req, "ai-light");
    if (limited) return limited;

    const notConfigured = aiNotConfigured();
    if (notConfigured) {
      return NextResponse.json({ detail: notConfigured }, { status: 500 });
    }

    const { resume } = await req.json() as { resume: string };
    if (!resume?.trim()) {
      return NextResponse.json({ detail: "Missing resume text." }, { status: 400 });
    }
    if (resume.length > 50_000) {
      return NextResponse.json({ detail: "Resume text too long. Maximum is 50,000 characters." }, { status: 400 });
    }

    const res = await generateJSON(`You are a resume parser. Extract structured profile data from this resume.

Return ONLY valid JSON with this exact structure:
{
  "name": "<full name>",
  "title": "<current or most recent job title>",
  "location": "<city, country if present>",
  "email": "<email if present, else null>",
  "linkedin": "<LinkedIn URL if present, else null>",
  "summary": "<professional summary — 2–3 sentences, using only what the resume states>",
  "story": "<'My story' for a public profile: first person, 2 short paragraphs, 80–130 words in all. Paragraph 1: the kind of work they do and where (roles, employers, field). Paragraph 2: what they have done, drawn from the resume's own bullets, and their education or certifications. Plain, warm, specific. Only facts the resume states: no personality traits, passions, motivations, goals or numbers it doesn't give.>",
  "years_experience": <integer — total years of professional experience>,
  "industries": ["<industry 1>", "<industry 2>"],
  "skills": ["<skill 1>", "<skill 2>"],
  "experience": [
    {
      "title": "<job title>",
      "company": "<company name>",
      "period": "<date range as written in resume>",
      "bullets": ["<achievement bullet>", "<achievement bullet>"]
    }
  ],
  "education": [
    {
      "degree": "<degree name>",
      "institution": "<institution name>",
      "year": "<graduation year or date range>"
    }
  ],
  "certifications": ["<cert 1>", "<cert 2>"]
}

Rules:
- Extract exactly what is in the resume. Do NOT invent anything.
- skills: list up to 16 most relevant technical and professional skills.
- experience: include up to 5 most recent roles. Each role: up to 4 bullets (strongest ones).
- certifications: return [] if none present.
- industries: 1–3 industries the candidate has worked in.
- years_experience: calculate from earliest to latest role. If unclear, estimate conservatively.
- story: separate the two paragraphs with a blank line. No headings, bullets or placeholders.

${NO_FABRICATION_RULES}

RESUME:
${resume}`, { temperature: 0.1 });

    // The summary and story are prose a stranger will read: same honesty check as the resume
    const profile = res as Record<string, unknown>;
    for (const field of ["summary", "story"] as const) {
      if (typeof profile[field] === "string" && profile[field]) {
        const clean = stripInventedContacts(profile[field] as string, resume);
        profile[field] = (await verifyClaims(clean, resume, { kind: "profile" })).text;
      }
    }

    return NextResponse.json(profile);
  } catch (err: unknown) {
    console.error("[profile route]", err);
    const { message, status } = handleAIError(err);
    return NextResponse.json({ detail: message }, { status });
  }
}
