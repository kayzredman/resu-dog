// The single place every AI call goes through. Routes call generateJSON(prompt) and never
// touch a provider SDK, so switching provider is one setting:
//
//   AI_PROVIDER=gemini   (GEMINI_API_KEY)  — free tier, for testing
//   AI_PROVIDER=openai   (OPENAI_API_KEY)
//   AI_MODEL=…           optional; overrides the provider's default model
//   AI_FALLBACK_MODEL=…  optional; tried when the main model stays overloaded
//
// If AI_PROVIDER is unset, whichever key is present is used (OpenAI first).

import { ApiError as GeminiApiError, GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

export type AIProvider = "openai" | "gemini";

const DEFAULT_MODELS: Record<AIProvider, string> = {
  openai: "gpt-4o",
  // Free-tier model on the Gemini API. (gemini-3.8-flash is newer but was often overloaded
  // on the free tier during testing; set AI_MODEL to try it.)
  gemini: "gemini-3.6-flash",
};

// Older free-tier model, used only when the main one is overloaded
const FALLBACK_MODELS: Record<AIProvider, string | null> = {
  openai: null,
  gemini: "gemini-3.5-flash-lite",
};

// Transient failures worth retrying: rate limits and provider overloads/outages
const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [1500, 4000];
// A single call that hangs is treated like an overload, so the run can move on
const REQUEST_TIMEOUT_MS = 60_000;

const KEY_VARS: Record<AIProvider, string> = {
  openai: "OPENAI_API_KEY",
  gemini: "GEMINI_API_KEY",
};

interface AIConfig {
  provider: AIProvider;
  model: string;
  fallbackModel: string | null;
  apiKey: string;
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

function resolveConfig(): AIConfig | { error: string } {
  const requested = process.env.AI_PROVIDER?.trim().toLowerCase();
  let provider: AIProvider;
  if (requested === "openai" || requested === "gemini") {
    provider = requested;
  } else if (requested) {
    return { error: `AI_PROVIDER "${requested}" is not supported. Use "gemini" or "openai".` };
  } else {
    provider = process.env.OPENAI_API_KEY ? "openai" : "gemini";
  }

  const apiKey = process.env[KEY_VARS[provider]]?.trim();
  if (!apiKey) {
    return { error: `AI is not configured: set ${KEY_VARS[provider]} in .env.local.` };
  }
  const model = process.env.AI_MODEL?.trim() || DEFAULT_MODELS[provider];
  const fallback = process.env.AI_FALLBACK_MODEL?.trim() || FALLBACK_MODELS[provider];
  return { provider, apiKey, model, fallbackModel: fallback && fallback !== model ? fallback : null };
}

/** Returns a setup message if no provider is configured, otherwise null. Check before any work. */
export function aiNotConfigured(): string | null {
  const config = resolveConfig();
  return "error" in config ? config.error : null;
}

let openaiClient: { key: string; client: OpenAI } | null = null;
let geminiClient: { key: string; client: GoogleGenAI } | null = null;

function parseJSON(text: string | null | undefined): unknown {
  if (!text) {
    throw new AIError("AI returned an empty response. Please try again.", 502);
  }
  try {
    return JSON.parse(text);
  } catch {
    // Some models wrap JSON in a markdown fence despite JSON mode
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) {
      try {
        return JSON.parse(fenced[1]);
      } catch {
        // fall through
      }
    }
    throw new AIError("AI returned an invalid response. Please try again.", 502);
  }
}

/**
 * Sends one prompt and returns the parsed JSON object the model replied with.
 * The prompt itself must describe the JSON shape it expects.
 */
export async function generateJSON(prompt: string, options: { temperature?: number } = {}): Promise<unknown> {
  const config = resolveConfig();
  if ("error" in config) throw new AIError(config.error, 500);

  const models = [config.model, ...(config.fallbackModel ? [config.fallbackModel] : [])];
  let lastError: unknown;
  for (const model of models) {
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      try {
        return await callModel(config, model, prompt, options.temperature);
      } catch (err) {
        lastError = err;
        const status = errorStatus(err);
        if (status === undefined || !RETRYABLE.has(status)) throw err;
        if (attempt < RETRY_DELAYS_MS.length) {
          console.warn(`[ai] ${config.provider}/${model} returned ${status}; retrying`);
          await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
        }
      }
    }
    if (model !== models[models.length - 1]) {
      console.warn(`[ai] ${config.provider}/${model} still unavailable; falling back to ${models[models.length - 1]}`);
    }
  }
  throw lastError;
}

function errorStatus(err: unknown): number | undefined {
  if (err instanceof OpenAI.APIConnectionTimeoutError) return 504;
  if (err instanceof OpenAI.APIError) return err.status;
  if (err instanceof GeminiApiError) return err.status;
  // Timeouts and aborted requests surface as plain errors
  if (err instanceof Error && /timeout|timed out|abort/i.test(`${err.name} ${err.message}`)) return 504;
  return undefined;
}

async function callModel(config: AIConfig, model: string, prompt: string, temperature?: number): Promise<unknown> {
  if (config.provider === "openai") {
    if (openaiClient?.key !== config.apiKey) {
      openaiClient = { key: config.apiKey, client: new OpenAI({ apiKey: config.apiKey, timeout: REQUEST_TIMEOUT_MS, maxRetries: 0 }) };
    }
    const res = await openaiClient.client.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature,
    });
    return parseJSON(res.choices?.[0]?.message?.content);
  }

  if (geminiClient?.key !== config.apiKey) {
    geminiClient = { key: config.apiKey, client: new GoogleGenAI({ apiKey: config.apiKey, httpOptions: { timeout: REQUEST_TIMEOUT_MS } }) };
  }
  const res = await geminiClient.client.models.generateContent({
    model,
    contents: prompt,
    config: { responseMimeType: "application/json", temperature },
  });
  return parseJSON(res.text);
}

/**
 * Map provider SDK errors to user-friendly messages and HTTP status codes.
 */
export function handleAIError(err: unknown): { message: string; status: number } {
  if (err instanceof AIError) {
    return { message: err.message, status: err.status };
  }

  const status = errorStatus(err);

  if (status !== undefined) {
    // Gemini reports a bad key as 400 "API key not valid"
    const badKey =
      status === 401 || status === 403 || (err instanceof GeminiApiError && /api key/i.test(err.message));
    if (badKey) return { message: "Invalid API key. Check server configuration.", status: 500 };
    switch (status) {
      case 429:
        return {
          message: "The AI service is busy or the free limit was reached. Please wait a moment and try again.",
          status: 429,
        };
      case 500:
      case 502:
      case 503:
      case 504:
        return { message: "AI service is temporarily unavailable. Please try again in a few minutes.", status: 502 };
      default:
        return { message: `AI service error (${status}). Please try again.`, status: status >= 400 ? status : 500 };
    }
  }

  // Anything else is an internal error: the caller logs it, the user gets a generic message
  return { message: "Something went wrong on our side. Please try again.", status: 500 };
}
