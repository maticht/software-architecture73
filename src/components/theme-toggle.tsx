"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "architecture-course-theme-v1";
type Theme = "dark" | "light";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") {
      return "dark";
    }

    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    return saved === "light" || saved === "dark" ? saved : "dark";
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  return (
    <button type="button" className="themeToggle" onClick={toggle} aria-label="Переключить тему">
      <span className="themeToggleDot" />
      <span>{theme === "dark" ? "Тёмная тема" : "Светлая тема"}</span>
    </button>
  );
}
