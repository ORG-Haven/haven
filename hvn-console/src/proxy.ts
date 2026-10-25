import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIES } from "@/lib/session-cookie";

// Read at runtime (proxy runs on Node), so one image works in every environment.
// 8081 is the port docker compose publishes the BFF on.
const BFF_URL = process.env.HVN_BFF_URL ?? "http://localhost:8081";

// Pages anyone can open. Every other page needs a session.
const PUBLIC = ["/signin", "/signup", "/forgot-password", "/verify-email"];
// Signed-in people are sent on to the console from these.
const SIGNED_OUT_ONLY = ["/signin", "/signup"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // /api/* is hvnBFF, served from the console's own origin so its session cookie is first-party.
  // The BFF sets and checks the cookie; this only forwards, Cookie and Set-Cookie included.
  if (pathname.startsWith("/api/")) {
    return NextResponse.rewrite(new URL(pathname.slice("/api".length) + search, BFF_URL));
  }

  // Optimistic check: only looks for the cookie. SessionGate confirms the session with the BFF,
  // and the BFF clears a cookie that no longer matches one.
  const signedIn = SESSION_COOKIES.some((name) => request.cookies.has(name));

  if (!signedIn && !PUBLIC.includes(pathname)) {
    const url = new URL("/signin", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (signedIn && SIGNED_OUT_ONLY.includes(pathname)) {
    return NextResponse.redirect(new URL("/projects", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Skip Next internals and files with an extension (favicon, images).
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
