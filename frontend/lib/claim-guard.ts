// Code-level check behind the "we never invent anything" promise. Prompts alone weren't enough:
// in testing the model added tools, integrations and whole sections to cover a job's gaps.
//
// After each AI writing step we look for terms the output relies on that the candidate's own
// material never mentions — proper nouns and technologies (MTN, Paystack, Kubernetes, GitHub)
// plus any job-ad skill the candidate doesn't have — then ask the model once to remove those
// claims, and finally delete whatever is left.

import { generateJSON } from "@/lib/ai-helpers";
import { NO_FABRICATION_RULES } from "@/lib/prompt-rules";

// Capitalised words that are normal in resumes/letters and never a claim on their own
const COMMON_CAPITALISED = new Set(
  `i a an the and or of in on at to for with by from as my our your their this that these those
   dear hiring manager sincerely regards kind best thank thanks yours faithfully truly
   present current now today summary profile experience education skills projects certifications
   contact references available upon request languages achievements objective professional
   january february march april may june july august september october november december
   jan feb mar apr jun jul aug sep sept oct nov dec spring summer autumn fall winter
   bsc ba ma msc mba phd hnd`.split(/\s+/)
);

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Whole-word, case-insensitive match that also works for terms like "C++", ".NET" or "CI/CD". */
export function hasTerm(text: string, term: string): boolean {
  const t = term.trim();
  if (!t) return false;
  return new RegExp(`(^|[^a-z0-9])${escapeRegex(t)}($|[^a-z0-9])`, "i").test(text);
}

/** Rough word stem so "APIs"/"API" and "mentored"/"mentoring" count as the same word. */
const stem = (word: string) => {
  const w = word.toLowerCase();
  if (w.length <= 4) return w.replace(/s$/, "");
  return w.replace(/(ings|ing|ed|ers|er|es|s)$/, "");
};

/** True if the candidate's material supports `term`, exactly or by word stems. */
export function supports(allowed: string, term: string): boolean {
  if (hasTerm(allowed, term)) return true;
  const allowedStems = new Set((allowed.match(/[A-Za-z][A-Za-z0-9+#]*/g) ?? []).map(stem));
  const words = term.match(/[A-Za-z][A-Za-z0-9+#]*/g) ?? [];
  return words.length > 0 && words.every((w) => allowedStems.has(stem(w)));
}

const isHeaderLine = (line: string) => {
  const letters = line.replace(/[^A-Za-z]/g, "");
  return letters.length >= 2 && letters === letters.toUpperCase();
};

/**
 * Proper nouns / technology names in `output` that `allowed` never mentions.
 * Sentence-initial words are skipped (they're usually verbs: "Developed", "Led").
 */
function unsupportedNames(output: string, allowed: string): string[] {
  const found = new Map<string, string>();
  for (const rawLine of output.split("\n")) {
    if (isHeaderLine(rawLine)) continue;
    // Placeholders like [X%] are deliberate
    const line = rawLine.replace(/\[[^\]\n]*\]/g, " ");
    let index = 0;
    for (const match of line.matchAll(/[A-Za-z0-9][A-Za-z0-9+#./&'-]*/g)) {
      const token = match[0].replace(/[.'-]+$/, "");
      const before = line.slice(0, match.index ?? 0);
      const sentenceStart = index === 0 || /(^\s*[-•*]?\s*$)|[.!?:]\s*$/.test(before);
      index++;
      if (sentenceStart) continue;
      for (const part of token.split(/[/-]/)) {
        if (!/[A-Z]/.test(part)) continue; // lowercase words are ordinary vocabulary
        const lower = part.toLowerCase();
        if (COMMON_CAPITALISED.has(lower) || part.length < 2) continue;
        if (supports(allowed, part)) continue;
        found.set(lower, part);
      }
    }
  }
  return [...found.values()];
}

/** Every term the output uses that the candidate's material doesn't support. */
export function findUnsupported(output: string, allowed: string, gapTerms: string[] = []): string[] {
  const terms = new Map<string, string>();
  for (const t of unsupportedNames(output, allowed)) terms.set(t.toLowerCase(), t);
  for (const t of gapTerms) {
    if (hasTerm(output, t) && !supports(allowed, t)) terms.set(t.toLowerCase(), t);
  }
  return [...terms.values()];
}

/**
 * Last resort: delete what still mentions an unsupported term. List lines (Skills) lose just
 * the offending items; other lines are dropped; headers left with nothing under them go too.
 */
export function removeUnsupported(text: string, terms: string[]): string {
  if (!terms.length) return text;
  const mentions = (s: string) => terms.some((t) => hasTerm(s, t));
  const isTitleOnly = (line: string) => line.trim().split(/\s+/).length <= 4 && !/[.,:;!?]/.test(line);

  // Work section by section so a section is only dropped if WE emptied it
  const sections: string[][] = [[]];
  for (const line of text.split("\n")) {
    if (isHeaderLine(line) && line.trim()) sections.push([line]);
    else sections[sections.length - 1].push(line);
  }

  const out: string[] = [];
  sections.forEach((section, i) => {
    const hasHeader = i > 0;
    const body = hasHeader ? section.slice(1) : section;
    let removed = false;
    const kept: string[] = [];
    for (const line of body) {
      if (!mentions(line)) {
        kept.push(line);
        continue;
      }
      removed = true;
      const listMatch = line.match(/^(\s*(?:[A-Za-z ]+:\s*)?)(.+,.+)$/);
      if (listMatch && !/[.!?]\s*$/.test(line.trim())) {
        const items = listMatch[2].split(",").map((s) => s.trim()).filter((item) => item && !mentions(item));
        if (items.length) kept.push(listMatch[1] + items.join(", "));
      }
      // Otherwise drop the line: a bullet or sentence built on an unsupported claim
    }
    const content = kept.filter((l) => l.trim());
    if (hasHeader && removed && content.every(isTitleOnly)) return; // nothing real left
    out.push(...(hasHeader ? [section[0]] : []), ...kept);
  });
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Runs the check on one piece of AI-written text. Returns cleaned text and what was removed.
 * `kind` only shapes the correction prompt.
 */
export async function enforceNoInventedClaims(
  text: string,
  allowed: string,
  options: { gapTerms?: string[]; kind?: "resume" | "cover letter" | "profile" } = {}
): Promise<{ text: string; removed: string[] }> {
  const gapTerms = options.gapTerms ?? [];
  const first = findUnsupported(text, allowed, gapTerms);
  if (!first.length) return { text, removed: [] };

  let candidate = text;
  try {
    const fixed = (await generateJSON(
      `This ${options.kind ?? "resume"} mentions things the candidate's own material never mentions: ${first.join(", ")}.

Rewrite it so that every claim involving those items is removed (delete the claim; don't replace it with something else invented). Change nothing else: keep the structure, wording, facts and any [bracket] placeholders.

${NO_FABRICATION_RULES}

Return ONLY valid JSON: { "text": "<the corrected ${options.kind ?? "resume"} as plain text>" }

CANDIDATE'S OWN MATERIAL (the only source of truth):
${allowed}

TEXT TO CORRECT:
${text}`,
      { temperature: 0 }
    )) as { text?: unknown };
    if (typeof fixed.text === "string" && fixed.text.trim().length > text.length * 0.4) {
      candidate = fixed.text;
    }
  } catch (err) {
    console.warn("[claim-guard] correction call failed; removing lines instead", err);
  }

  const remaining = findUnsupported(candidate, allowed, gapTerms);
  const cleaned = dropEmptySections(removeUnsupported(candidate, remaining));
  console.warn(`[claim-guard] removed unsupported: ${first.join(", ")}`);
  return { text: cleaned, removed: first };
}

interface LineFix {
  original: string;
  corrected: string;
}

const normLine = (v: string) => v.replace(/^[\s\-•*]+/, "").replace(/\s+/g, " ").trim().toLowerCase();

/** Drops section headers that have nothing under them (e.g. after a summary was emptied). */
function dropEmptySections(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (isHeaderLine(lines[i]) && lines[i].trim() && i > 0) {
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j++;
      if (j >= lines.length || isHeaderLine(lines[j])) continue;
    }
    out.push(lines[i]);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Removes lines that are nothing but a placeholder (e.g. "[List relevant certifications here]"). */
function dropPlaceholderOnlyLines(text: string): string {
  return text
    .split("\n")
    .filter((l) => !/^\s*[-•*]?\s*\[[^\]]*\]\s*[.:]?\s*$/.test(l))
    .join("\n");
}

/**
 * Applies fact-check corrections: each flagged line (or sentence inside a paragraph) is replaced
 * by its corrected version, so true facts survive and only the unsupported part goes.
 * Exported for tests.
 */
export function applyLineFixes(text: string, fixes: LineFix[]): { text: string; changed: string[] } {
  const changed: string[] = [];
  let out = text;
  for (const { original, corrected } of fixes) {
    const target = original.trim();
    if (target.length < 6) continue;
    const fixed = corrected.trim();

    // 1. Exact substring (a whole line, or a sentence inside a paragraph)
    if (out.includes(target)) {
      // Keep the bullet marker if the correction dropped it
      const bullet = target.match(/^[-•*]\s*/)?.[0] ?? "";
      out = out.replace(target, fixed && bullet && !/^[-•*]/.test(fixed) ? bullet + fixed : fixed);
      changed.push(target);
      continue;
    }
    // 2. Same line ignoring bullet markers, spacing and case
    const lines = out.split("\n");
    const idx = lines.findIndex((l) => normLine(l) === normLine(target));
    if (idx >= 0) {
      const bullet = lines[idx].match(/^\s*[-•*]\s*/)?.[0] ?? "";
      lines[idx] = fixed ? bullet + fixed.replace(/^[-•*]\s*/, "") : "";
      out = lines.join("\n");
      changed.push(target);
    }
  }
  // A bullet emptied of everything leaves a bare marker
  out = out
    .split("\n")
    .filter((l, i, all) => !/^\s*[-•*]\s*$/.test(l) && !(l.trim() === "" && all[i - 1]?.trim() === ""))
    .map((l) => l.replace(/(\S) {2,}/g, "$1 ").trim())
    .join("\n");
  return { text: dropEmptySections(out), changed };
}

/**
 * Fact-check pass for what word matching can't see: paraphrased inventions made of ordinary
 * words ("integrated payment gateways", "provided informal mentorship"). A separate call flags
 * lines the source doesn't fully support and returns each with only the supported part kept.
 */
async function factCheck(text: string, source: string, kind: string): Promise<{ text: string; removed: string[] }> {
  let fixes: LineFix[] = [];
  try {
    const res = (await generateJSON(
      `You are a strict fact-checker for a ${kind}. Compare the TEXT with the candidate's SOURCE material.

Find every line or sentence in the TEXT that states something the SOURCE does not support: a responsibility, task, integration, tool, skill, result, trait or qualification that isn't in the SOURCE, a specific number that isn't in the SOURCE, a total number of years of experience that doesn't match the dates in the SOURCE, or a job title, employer name or date that differs from the SOURCE (the corrected version must use the SOURCE's exact title, employer and dates).

For each one, give a corrected version that keeps everything the SOURCE does support and removes only the unsupported part, as a clean, grammatical sentence. Drop an unsupported outcome clause entirely rather than replacing it; do not add new placeholders (keep any that are already there). Keep the TEXT's improved wording and strong verbs — do not revert to the SOURCE's wording. If nothing supported remains, use an empty string.

These are fine and must NOT be flagged: rewording, stronger verbs, reordering, section headings, contact details copied from the SOURCE, [bracket] placeholders, and outcomes stated only as a placeholder (e.g. "by [X%]").${kind === "cover letter" ? " Naming the employer and role being applied for is fine." : ""}

Copy each "original" exactly as it appears in the TEXT. If everything is supported, return an empty list.

Return ONLY valid JSON: { "fixes": [ { "original": "<exact line or sentence from the TEXT>", "corrected": "<corrected version, or empty string>" } ] }

SOURCE:
${source}

TEXT:
${text}`,
      { temperature: 0 }
    )) as { fixes?: unknown };
    if (Array.isArray(res.fixes)) {
      fixes = res.fixes.filter(
        (f): f is LineFix =>
          !!f && typeof (f as LineFix).original === "string" && typeof (f as LineFix).corrected === "string"
      );
    }
  } catch (err) {
    // The word-level checks already ran; a failed fact-check shouldn't fail the whole request
    console.warn("[claim-guard] fact-check call failed", err);
    return { text, removed: [] };
  }
  if (!fixes.length) return { text, removed: [] };

  const { text: fixed, changed } = applyLineFixes(text, fixes);
  if (changed.length) console.warn(`[claim-guard] fact-check corrected ${changed.length}: ${changed.join(" | ").slice(0, 300)}`);
  return { text: fixed, removed: changed };
}

/** Word-level check, then the fact-check pass. Use this for every AI-written resume/letter/profile. */
export async function verifyClaims(
  text: string,
  allowed: string,
  options: { gapTerms?: string[]; kind?: "resume" | "cover letter" | "profile"; factSource?: string } = {}
): Promise<{ text: string; removed: string[] }> {
  // A section that is only "[fill this in]" invites invention: drop it before anything else
  const lexical = await enforceNoInventedClaims(dropEmptySections(dropPlaceholderOnlyLines(text)), allowed, options);
  const facts = await factCheck(lexical.text, options.factSource ?? allowed, options.kind ?? "resume");
  return { text: facts.text, removed: [...lexical.removed, ...facts.removed] };
}
