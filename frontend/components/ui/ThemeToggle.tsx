"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-9 w-9" />;

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-foreground-muted hover:text-foreground hover:border-line-hover transition-all"
    >
      <Sun
        className="absolute h-4 w-4 transition-all duration-300"
        style={{
          opacity: isDark ? 0 : 1,
          transform: isDark ? "scale(0.5) rotate(90deg)" : "scale(1) rotate(0deg)",
        }}
      />
      <Moon
        className="absolute h-4 w-4 transition-all duration-300"
        style={{
          opacity: isDark ? 1 : 0,
          transform: isDark ? "scale(1) rotate(0deg)" : "scale(0.5) rotate(-90deg)",
        }}
      />
    </button>
  );
}
