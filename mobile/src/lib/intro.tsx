// Whether the first-run welcome screen has been seen. Stored on the device only.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const KEY = 'resudog.intro-seen.v1';

interface Intro {
  /** null while loading from storage */
  seen: boolean | null;
  finish: () => void;
  replay: () => void;
}

const IntroContext = createContext<Intro | null>(null);

export function IntroProvider({ children }: { children: ReactNode }) {
  const [seen, setSeen] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => setSeen(v === '1'))
      // Storage unavailable: show the intro rather than block the app
      .catch(() => setSeen(false));
  }, []);

  const finish = useCallback(() => {
    setSeen(true);
    AsyncStorage.setItem(KEY, '1').catch(() => {});
  }, []);

  const replay = useCallback(() => setSeen(false), []);

  const value = useMemo(() => ({ seen, finish, replay }), [seen, finish, replay]);
  return <IntroContext.Provider value={value}>{children}</IntroContext.Provider>;
}

export function useIntro(): Intro {
  const ctx = useContext(IntroContext);
  if (!ctx) throw new Error('useIntro must be used inside <IntroProvider>');
  return ctx;
}
