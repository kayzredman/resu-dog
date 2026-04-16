import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { parseAIResponse, handleOpenAIError } from "@/lib/ai-helpers";

// POST /api/v1/profile
// Body: { resume: string }
// Returns: ProfileData JSON

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { detail: "OPENAI_API_KEY is not set." },
        { status: 500 }
      );
    }

    const { resume } = await req.json() as { resume: string };
    if (!resume?.trim()) {
      return NextResponse.json({ detail: "Missing resume text." }, { status: 400 });
    }

    const client = new OpenAI({ apiKey });

    const res = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: `You are a resume parser. Extract structured profile data from this resume.

Return ONLY valid JSON with this exact structure:
{
  "name": "<full name>",
  "title": "<current or most recent job title>",
  "location": "<city, country if present>",
  "email": "<email if present, else null>",
  "linkedin": "<LinkedIn URL if present, else null>",
  "summary": "<professional summary — 2–3 sentences, from resume or inferred from experience>",
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

RESUME:
${resume}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    return NextResponse.json(parseAIResponse(res));
  } catch (err: unknown) {
    console.error("[profile route]", err);
    const { message, status } = handleOpenAIError(err);
    return NextResponse.json({ detail: message }, { status });
  }
}
