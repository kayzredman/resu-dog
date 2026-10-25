// Shared prompt rules for every AI call that writes or rewrites resume content.
// Resu-Dog's promise is "we never fabricate" — these rules are where that promise lives.

/** Matches fill-in placeholders such as "[X%]" or "[# users]" left in AI output. */
export const PLACEHOLDER_PATTERN = /\[[^\[\]\n]{1,40}\]/g;

export const NO_FABRICATION_RULES = `Honesty rules (these override every other instruction):
- Use ONLY facts present in the source material. Never invent numbers, percentages, money amounts, team sizes, user counts, tools, skills, certifications, employers, titles or dates.
- When an achievement would be stronger with a number the source does not give, do NOT guess one. Insert a short placeholder in square brackets for the candidate to fill in, e.g. "by [X%]", "for [# users]", "saving [$ amount]". Use at most one placeholder per bullet, and only where a real figure plausibly exists.
- Never add a skill or keyword from the job description unless the source shows the candidate has it. Missing skills belong in the assessment, not in the resume.
- Never add contact details, links or profiles (LinkedIn, GitHub, portfolio, email, phone, address) that are not in the source — not even as an example.
- Never add details the source does not state: no new responsibilities, topics, methods (e.g. "agile"), technologies or results (e.g. "improving reliability"). If a bullet needs an outcome the source doesn't give, use a placeholder such as "[result]".
- Do not state a total number of years of experience; the dates already show it.
- Don't create new sections (e.g. Projects, Achievements, Certifications) that the source doesn't have, and don't repeat the same achievement twice.
- Rewording, reordering, tightening and choosing stronger verbs is allowed; adding claims is not.`;

/** For scoring and review prompts: placeholders are deliberate, not a flaw to penalise. */
export const PLACEHOLDER_NOTE = `Note: square-bracket items such as [X%] or [# users] are intentional blanks the candidate will fill in with their real figures before sending. Assess the resume as if each were filled with a realistic value. Do not penalise, flag or mention them.`;

// Links only: a scheme, "www." or a domain followed by a path (so "ASP.NET" or "Node.js" are left alone)
const URL_PATTERN = /(?:https?:\/\/[^\s|,;)]+|\bwww\.[^\s|,;)]+|\b(?:[a-z0-9-]+\.)+[a-z]{2,}\/[^\s|,;)]+)/gi;
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const PHONE_PATTERN = /\+?\d[\d\s().-]{7,}\d/g;

const normalize = (v: string) => v.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/[\s().-]/g, "").replace(/\/+$/, "");

/**
 * Safety net for the honesty rules: removes any link, email or phone number in the AI's
 * output that does not appear in the candidate's own source text.
 */
export function stripInventedContacts(output: string, source: string): string {
  const known = new Set<string>();
  for (const pattern of [URL_PATTERN, EMAIL_PATTERN, PHONE_PATTERN]) {
    for (const m of source.match(pattern) ?? []) known.add(normalize(m));
  }
  const isKnown = (m: string) => known.has(normalize(m));

  let out = output.replace(EMAIL_PATTERN, (m) => (isKnown(m) ? m : ""));
  out = out.replace(URL_PATTERN, (m, offset: number, whole: string) => {
    // Leave the domain part of an email alone (already handled above)
    if (whole[offset - 1] === "@") return m;
    return isKnown(m) ? m : "";
  });
  out = out.replace(PHONE_PATTERN, (m) => (isKnown(m) || m.replace(/\D/g, "").length < 9 ? m : ""));

  // Tidy separators left behind ("a |  | b", trailing "|")
  return out
    .split("\n")
    .map((line) =>
      line
        .replace(/(\s*\|\s*)+(?=\s*\|)/g, "")
        .replace(/^\s*\|\s*/, "")
        .replace(/\s*\|\s*$/, "")
        .replace(/\s{2,}/g, " ")
        .trimEnd()
    )
    .join("\n");
}
