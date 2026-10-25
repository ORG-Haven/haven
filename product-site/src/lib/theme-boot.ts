// Shared by the root layout (server) and the theme store (client).
export const THEME_STORAGE_KEY = "haven-theme";

/** Runs before first paint (see layout.tsx) so the saved theme never flashes. */
export const themeBootScript = `try{if(localStorage.getItem("${THEME_STORAGE_KEY}")==="light"){var c=document.documentElement.classList;c.remove("dark");c.add("light")}}catch(e){}`;
