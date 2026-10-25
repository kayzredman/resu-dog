// Client for the Resu-Dog web API (the Next.js app in ../frontend).

import Constants from 'expo-constants';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import type {
  BuildAnalysis,
  BuildQuestion,
  BuildResult,
  Mode,
  OptimizeResult,
  PickedFile,
} from '@/lib/types';

const DEV_API_PORT = 3000;
// The full pipelines make several AI calls in a row plus honesty checks; the server allows 300s
const LONG_TIMEOUT_MS = 280_000;
const SHORT_TIMEOUT_MS = 45_000;

/**
 * Where the API lives:
 * 1. EXPO_PUBLIC_API_URL if set (required for production builds)
 * 2. In development, the machine running `expo start` — so the simulator and a phone on
 *    the same Wi-Fi both reach the Next.js dev server without extra setup
 */
export function getApiBaseUrl(): string | null {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');
  if (fromEnv) return fromEnv;

  if (__DEV__) {
    const host = Constants.expoConfig?.hostUri?.split(':')[0];
    if (host) return `http://${host}:${DEV_API_PORT}`;
    return Platform.OS === 'android' ? `http://10.0.2.2:${DEV_API_PORT}` : `http://localhost:${DEV_API_PORT}`;
  }
  return null;
}

export class ApiError extends Error {}

async function request<T>(path: string, init: RequestInit, timeoutMs: number): Promise<T> {
  const base = getApiBaseUrl();
  if (!base) {
    throw new ApiError('The app is not connected to a Resu-Dog server yet.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${base}${path}`, { ...init, signal: controller.signal });
  } catch (err) {
    if (__DEV__) console.warn(`[api] ${path} failed`, err);
    if (controller.signal.aborted) {
      throw new ApiError('This is taking longer than expected. Please try again.');
    }
    throw new ApiError("Couldn't reach Resu-Dog. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }

  const data = (await res.json().catch(() => ({}))) as { detail?: string };
  if (!res.ok) {
    throw new ApiError(data.detail ?? `Something went wrong (${res.status}). Please try again.`);
  }
  return data as T;
}

const postJson = <T>(path: string, body: unknown, timeoutMs = SHORT_TIMEOUT_MS) =>
  request<T>(
    path,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    timeoutMs
  );

// ─── Optimize ────────────────────────────────────────────────────────────────

export function optimizeResume(file: PickedFile, mode: Mode, jobDescription: string) {
  const form = new FormData();
  // expo-file-system's File is a real Blob, which Expo's fetch can stream as a multipart part
  form.append('file', new File(file.uri), file.name);
  form.append('mode', mode);
  if (mode === 'targeted') form.append('job_description', jobDescription);

  return request<OptimizeResult>('/api/v1/optimize', { method: 'POST', body: form }, LONG_TIMEOUT_MS);
}

// ─── Build CV wizard ─────────────────────────────────────────────────────────

export function analyzeJob(jobDescription: string) {
  return postJson<BuildAnalysis>('/api/v1/build', { action: 'analyze', job_description: jobDescription });
}

export function assistAnswer(analysis: BuildAnalysis, question: BuildQuestion, answers: Record<string, string>) {
  return postJson<{ suggestion?: string }>('/api/v1/build', {
    action: 'assist',
    role_title: analysis.role_title,
    seniority: analysis.seniority,
    industry: analysis.industry,
    section: question.section,
    question: question.question,
    existing_answers: answers,
  });
}

export function writeCv(jobDescription: string, answers: Record<string, string>, questions: BuildQuestion[]) {
  return postJson<BuildResult>(
    '/api/v1/build',
    { action: 'write', job_description: jobDescription, answers, questions },
    LONG_TIMEOUT_MS
  );
}

// ─── Export formats ──────────────────────────────────────────────────────────

export type ExportFormat = 'linkedin' | 'wes' | 'uk';

export function exportResume(resume: string, format: ExportFormat) {
  return postJson<{ formatted?: string; about?: string }>('/api/v1/export', { resume, format });
}
