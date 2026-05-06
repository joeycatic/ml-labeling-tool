"use client";

import { MoonStar, SunMedium } from "lucide-react";
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "ml-labeling-theme";
const THEME_EVENT = "ml-labeling-theme-change";

function getThemeSnapshot(): "light" | "dark" {
  if (typeof document === "undefined") {
    return "light";
  }

  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleChange = () => onStoreChange();
  window.addEventListener(THEME_EVENT, handleChange);
  window.addEventListener("storage", handleChange);

  return () => {
    window.removeEventListener(THEME_EVENT, handleChange);
    window.removeEventListener("storage", handleChange);
  };
}

function applyTheme(theme: "light" | "dark") {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  window.localStorage.setItem(STORAGE_KEY, theme);
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getThemeSnapshot, () => "light");

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => {
        const nextTheme = isDark ? "light" : "dark";
        applyTheme(nextTheme);
      }}
      className={`theme-toggle theme-slider relative inline-flex h-10 w-[72px] items-center rounded-full border px-1 ${
        isDark
          ? "border-stone-900 bg-stone-900 text-white"
          : "border-stone-200 bg-white text-stone-800"
      }`}
    >
      <span className="pointer-events-none absolute inset-y-0 left-3 inline-flex items-center text-stone-500 transition-colors duration-300 dark:text-stone-400">
        <SunMedium className="h-3.5 w-3.5" />
      </span>
      <span className="pointer-events-none absolute inset-y-0 right-3 inline-flex items-center text-stone-500 transition-colors duration-300 dark:text-stone-300">
        <MoonStar className="h-3.5 w-3.5" />
      </span>
      <span
        className={`theme-slider-thumb pointer-events-none inline-flex h-8 w-8 items-center justify-center rounded-full shadow-[0_14px_24px_-18px_rgba(0,0,0,0.45)] ${
          isDark
            ? "translate-x-8 bg-white text-stone-950"
            : "translate-x-0 bg-stone-900 text-white"
        }`}
      >
        {isDark ? <MoonStar className="h-4 w-4" /> : <SunMedium className="h-4 w-4" />}
      </span>
    </button>
  );
}
