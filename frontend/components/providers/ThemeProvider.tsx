"use client";

import { useEffect } from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";

export const THEME_PREF_KEY = "theme-preference"; // "auto" | "light" | "dark"

export function getTimeBasedTheme() {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18 ? "light" : "dark";
}

/** Apply time-based theme when preference is "auto" (or unset). */
function TimeBasedDefault() {
  const { setTheme } = useTheme();

  useEffect(() => {
    const pref = localStorage.getItem(THEME_PREF_KEY);
    if (pref && pref !== "auto") return; // user chose light/dark explicitly

    setTheme(getTimeBasedTheme());
  }, [setTheme]);

  return null;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      themes={["light", "dark"]}
    >
      <TimeBasedDefault />
      {children}
    </NextThemesProvider>
  );
}
