"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { THEME_PREF_KEY, getTimeBasedTheme } from "@/components/providers/ThemeProvider";

type ThemeMode = "auto" | "light" | "dark";
const CYCLE: ThemeMode[] = ["auto", "light", "dark"];

const LABELS: Record<ThemeMode, string> = {
  auto: "Auto (time-based)",
  light: "Light mode",
  dark: "Dark mode",
};

export function ThemeToggle() {
  const { setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<ThemeMode>("auto");

  useEffect(() => {
    const stored = localStorage.getItem(THEME_PREF_KEY) as ThemeMode | null;
    setMode(stored && CYCLE.includes(stored) ? stored : "auto");
    setMounted(true);
  }, []);

  if (!mounted) return <div className="h-9 w-9" />;

  const handleClick = () => {
    const next = CYCLE[(CYCLE.indexOf(mode) + 1) % CYCLE.length];
    setMode(next);
    localStorage.setItem(THEME_PREF_KEY, next);

    if (next === "auto") {
      setTheme(getTimeBasedTheme());
    } else {
      setTheme(next);
    }
  };

  return (
    <button
      onClick={handleClick}
      aria-label={LABELS[mode]}
      title={LABELS[mode]}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-foreground-muted hover:text-foreground hover:border-line-hover transition-all"
    >
      <Clock
        className="absolute h-4 w-4 transition-all duration-300"
        style={{
          opacity: mode === "auto" ? 1 : 0,
          transform: mode === "auto" ? "scale(1) rotate(0deg)" : "scale(0.5) rotate(-90deg)",
        }}
      />
      <Sun
        className="absolute h-4 w-4 transition-all duration-300"
        style={{
          opacity: mode === "light" ? 1 : 0,
          transform: mode === "light" ? "scale(1) rotate(0deg)" : "scale(0.5) rotate(90deg)",
        }}
      />
      <Moon
        className="absolute h-4 w-4 transition-all duration-300"
        style={{
          opacity: mode === "dark" ? 1 : 0,
          transform: mode === "dark" ? "scale(1) rotate(0deg)" : "scale(0.5) rotate(-90deg)",
        }}
      />
    </button>
  );
}
