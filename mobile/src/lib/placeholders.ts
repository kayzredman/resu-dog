// Fill-in placeholders such as "[X%]" that the AI leaves where a real number belongs.
// Same rule as the web app (frontend/lib/prompt-rules.ts). Counts always come from the text itself.

export const PLACEHOLDER_PATTERN = /\[[^\[\]\n]{1,40}\]/g;

export function countPlaceholders(text: string): number {
  return text.match(PLACEHOLDER_PATTERN)?.length ?? 0;
}

/** Splits text into plain and placeholder parts: odd indexes are placeholders. */
export function splitPlaceholders(text: string): string[] {
  return text.split(new RegExp(`(${PLACEHOLDER_PATTERN.source})`, 'g'));
}
