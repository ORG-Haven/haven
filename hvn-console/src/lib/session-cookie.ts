// Set by hvnBFF: "__Host-haven_session" when COOKIE_SECURE is on (always in production),
// "haven_session" when it's off for local HTTP. proxy.ts only checks that one is present.
export const SESSION_COOKIES = ["__Host-haven_session", "haven_session"];
