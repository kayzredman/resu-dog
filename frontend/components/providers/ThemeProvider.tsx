"use client";

import { useEffect } from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";

/** Set theme based on local time if user hasn't manually chosen one. */
function TimeBasedDefault() {
  const { setTheme } = useTheme();

  useEffect(() => {
    // If user already picked a theme manually, don't override
    if (localStorage.getItem("theme")) return;

    const hour = new Date().getHours();
    // 6 AM – 6 PM → light, otherwise → dark
    setTheme(hour >= 6 && hour < 18 ? "light" : "dark");
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
