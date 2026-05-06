"use client";

import { MoonStar, SunMedium } from "lucide-react";
import { useState } from "react";

const STORAGE_KEY = "ml-labeling-theme";

function applyTheme(theme: "light" | "dark") {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  window.localStorage.setItem(STORAGE_KEY, theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
      ? "dark"
      : "light",
  );

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => {
        const nextTheme = isDark ? "light" : "dark";
        setTheme(nextTheme);
        applyTheme(nextTheme);
      }}
      className="theme-toggle nav-pill inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm font-medium text-stone-800 hover:border-stone-300 hover:bg-stone-100"
    >
      {isDark ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
      <span>{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}
