import OpenAI from "openai";

/**
 * Safely parse JSON from an OpenAI chat completion response.
 * Throws a descriptive error instead of crashing on null/malformed content.
 */
export function parseAIResponse(response: OpenAI.Chat.Completions.ChatCompletion): unknown {
  const content = response.choices?.[0]?.message?.content;
  if (!content) {
    throw new AIError("AI returned an empty response. Please try again.", 502);
  }
  try {
    return JSON.parse(content);
  } catch {
    throw new AIError("AI returned an invalid response. Please try again.", 502);
  }
}

/**
 * Custom error class for AI-related failures with user-friendly messages.
 */
export class AIError extends Error {
  status: number;
  constructor(message: string, status: number = 500) {
    super(message);
    this.name = "AIError";
    this.status = status;
  }
}

/**
 * Map OpenAI SDK errors to user-friendly messages and HTTP status codes.
 */
export function handleOpenAIError(err: unknown): { message: string; status: number } {
  if (err instanceof AIError) {
    return { message: err.message, status: err.status };
  }

  if (err instanceof OpenAI.APIError) {
    switch (err.status) {
      case 401:
        return { message: "Invalid API key. Check server configuration.", status: 500 };
      case 429:
        return { message: "AI service is temporarily overloaded. Please wait a moment and try again.", status: 429 };
      case 500:
      case 502:
      case 503:
        return { message: "AI service is temporarily unavailable. Please try again in a few minutes.", status: 502 };
      default:
        return { message: `AI service error (${err.status}). Please try again.`, status: err.status ?? 500 };
    }
  }

  if (err instanceof Error) {
    return { message: err.message, status: 500 };
  }

  return { message: "Unexpected server error", status: 500 };
}
