"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Clock, MonitorSmartphone } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { THEME_PREF_KEY, getTimeBasedTheme } from "@/components/providers/ThemeProvider";

type ThemeMode = "system" | "time" | "light" | "dark";
const CYCLE: ThemeMode[] = ["system", "light", "dark", "time"];

const LABELS: Record<ThemeMode, string> = {
  system: "Theme: match my device",
  time: "Theme: light by day, dark at night",
  light: "Theme: light",
  dark: "Theme: dark",
};

const ICONS: Record<ThemeMode, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  system: MonitorSmartphone,
  time: Clock,
  light: Sun,
  dark: Moon,
};

function readStoredMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_PREF_KEY);
    if (stored === "auto") return "time"; // preference saved by the previous version
    return CYCLE.includes(stored as ThemeMode) ? (stored as ThemeMode) : "system";
  } catch {
    return "system";
  }
}

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

export function ThemeToggle() {
  const { setTheme } = useTheme();
  // null on the server, so the first client render matches the server HTML
  const storedMode = useSyncExternalStore(subscribe, readStoredMode, () => null);
  const [chosenMode, setChosenMode] = useState<ThemeMode | null>(null);
  const mode = chosenMode ?? storedMode;

  if (!mode) return <div className="h-11 w-11" />;

  const handleClick = () => {
    const next = CYCLE[(CYCLE.indexOf(mode) + 1) % CYCLE.length];
    setChosenMode(next);
    try {
      localStorage.setItem(THEME_PREF_KEY, next);
    } catch {
      // Storage blocked — the choice still applies for this visit
    }
    setTheme(next === "time" ? getTimeBasedTheme() : next);
  };

  return (
    <button
      onClick={handleClick}
      aria-label={LABELS[mode]}
      title={LABELS[mode]}
      className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface text-foreground-muted hover:text-foreground hover:border-line-hover active:scale-95 transition-all"
    >
      {CYCLE.map((m) => {
        const Icon = ICONS[m];
        return (
          <Icon
            key={m}
            className="absolute h-4 w-4 transition-all duration-300"
            style={{
              opacity: mode === m ? 1 : 0,
              transform: mode === m ? "scale(1) rotate(0deg)" : "scale(0.5) rotate(-90deg)",
            }}
          />
        );
      })}
    </button>
  );
}
