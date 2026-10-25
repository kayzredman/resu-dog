// The profile this phone has published, so it can be shared again or taken down later.
// Only the link and its private delete key are kept on the phone; the profile lives on the server.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import type { PublishedProfile } from '@/lib/types';

const KEY = 'resudog.published-profile.v1';

let current: PublishedProfile | null | undefined; // undefined = not loaded yet
const listeners = new Set<(p: PublishedProfile | null) => void>();

async function load(): Promise<PublishedProfile | null> {
  if (current !== undefined) return current;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    current = raw ? (JSON.parse(raw) as PublishedProfile) : null;
  } catch {
    current = null;
  }
  return current;
}

export async function savePublished(profile: PublishedProfile | null) {
  current = profile;
  listeners.forEach((l) => l(profile));
  try {
    if (profile) await AsyncStorage.setItem(KEY, JSON.stringify(profile));
    else await AsyncStorage.removeItem(KEY);
  } catch {
    // Storage blocked: the link still works, but this phone won't remember it after a restart
  }
}

/** The published profile, or null. `loaded` is false until storage has been read. */
export function usePublished() {
  const [published, setPublished] = useState<PublishedProfile | null>(current ?? null);
  const [loaded, setLoaded] = useState(current !== undefined);

  useEffect(() => {
    let alive = true;
    load().then((p) => {
      if (!alive) return;
      setPublished(p);
      setLoaded(true);
    });
    listeners.add(setPublished);
    return () => {
      alive = false;
      listeners.delete(setPublished);
    };
  }, []);

  return { published, loaded };
}
