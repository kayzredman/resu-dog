// In-memory state shared between screens for the current session.
// Nothing is persisted: a resume never leaves the phone except to be processed by the API.

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { BuildAnalysis, BuildResult, OptimizeResult } from '@/lib/types';

interface Session {
  optimizeResult: OptimizeResult | null;
  setOptimizeResult: (r: OptimizeResult | null) => void;

  buildJobDescription: string;
  setBuildJobDescription: (jd: string) => void;
  buildAnalysis: BuildAnalysis | null;
  setBuildAnalysis: (a: BuildAnalysis | null) => void;
  buildAnswers: Record<string, string>;
  setBuildAnswers: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
  buildResult: BuildResult | null;
  setBuildResult: (r: BuildResult | null) => void;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [optimizeResult, setOptimizeResult] = useState<OptimizeResult | null>(null);
  const [buildJobDescription, setBuildJobDescription] = useState('');
  const [buildAnalysis, setBuildAnalysis] = useState<BuildAnalysis | null>(null);
  const [buildAnswers, setBuildAnswersState] = useState<Record<string, string>>({});
  const [buildResult, setBuildResult] = useState<BuildResult | null>(null);

  const value = useMemo<Session>(
    () => ({
      optimizeResult,
      setOptimizeResult,
      buildJobDescription,
      setBuildJobDescription,
      buildAnalysis,
      setBuildAnalysis,
      buildAnswers,
      setBuildAnswers: (updater) => setBuildAnswersState(updater),
      buildResult,
      setBuildResult,
    }),
    [optimizeResult, buildJobDescription, buildAnalysis, buildAnswers, buildResult]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}
