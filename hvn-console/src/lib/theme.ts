"use client";

import { useSyncExternalStore } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "haven-theme";
const listeners = new Set<() => void>();

/** Runs before first paint (see layout.tsx) so the saved theme never flashes. */
export const themeBootScript = `try{if(localStorage.getItem("${STORAGE_KEY}")==="light"){var c=document.documentElement.classList;c.remove("dark");c.add("light")}}catch(e){}`;

function read(): Theme {
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

export function setTheme(theme: Theme) {
  const cl = document.documentElement.classList;
  cl.remove("dark", "light");
  cl.add(theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage can be unavailable (private mode); the theme still applies for this visit.
  }
  listeners.forEach((l) => l());
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => "dark",
  );
}
