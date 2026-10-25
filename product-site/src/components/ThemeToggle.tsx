"use client";

import { setTheme, useTheme } from "@/lib/theme";
import { Icon } from "./ui";

export function ThemeToggle() {
  const theme = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button className="ib" aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`} onClick={() => setTheme(next)}>
      <Icon name={theme === "dark" ? "light_mode" : "dark_mode"} />
    </button>
  );
}
