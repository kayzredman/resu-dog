"use client";

import { useEffect } from "react";
import { MotionConfig } from "framer-motion";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";

export const THEME_PREF_KEY = "theme-preference"; // "system" | "time" | "light" | "dark"

export function getTimeBasedTheme() {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18 ? "light" : "dark";
}

/** Re-apply the light-by-day / dark-by-night theme for visitors who chose it. */
function TimeBasedTheme() {
  const { setTheme } = useTheme();

  useEffect(() => {
    let pref: string | null = null;
    try {
      pref = localStorage.getItem(THEME_PREF_KEY);
    } catch {
      return;
    }
    if (pref === "time" || pref === "auto") setTheme(getTimeBasedTheme());
  }, [setTheme]);

  return null;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    // Phones' own dark-mode setting is the default; next-themes applies it before first paint
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      themes={["light", "dark"]}
    >
      <TimeBasedTheme />
      {/* Respect the OS "reduce motion" setting for every Framer Motion animation */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </NextThemesProvider>
  );
}
