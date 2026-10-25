// Where the marketing site sends people who want to sign in or sign up.
// NEXT_PUBLIC_ values are inlined at build time, so set it before `npm run build`.
export const CONSOLE_URL = process.env.NEXT_PUBLIC_CONSOLE_URL ?? "http://localhost:3000";

export const SIGN_IN_URL = `${CONSOLE_URL}/signin`;
export const SIGN_UP_URL = `${CONSOLE_URL}/signup`;

// TODO: point at the real sales inbox or contact form.
export const CONTACT_URL = "#contact";
