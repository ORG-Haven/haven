"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ActionButton } from "@/components/ui";
import { ApiError } from "@/lib/api/errors";
import { errorMessage } from "@/lib/format";
import { useSignIn } from "@/lib/queries";
import { AuthPanel } from "./AuthPanel";
import { AuthBrand, AuthFooter, ErrorBanner, PasswordField, ProviderButtons } from "./parts";

/** Where to go after signing in: the page the proxy turned the user away from, if it's one of ours. */
function nextPath() {
  const next = new URLSearchParams(window.location.search).get("next");
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/projects";
}

const rateLimited = (err: unknown) => err instanceof ApiError && err.status === 429;

export function SignInView() {
  const router = useRouter();
  const signIn = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    signIn.mutate({ email, password }, { onSuccess: () => router.replace(nextPath()) });
  };

  return (
    <>
      <AuthPanel />
      <main className="auth-main">
        <div className="auth-col">
          <AuthBrand />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h1 className="auth-title">Sign in</h1>
            <p className="v" style={{ margin: 0 }}>
              New to Haven? <Link href="/signup">Create an account</Link>
            </p>
          </div>

          <ProviderButtons verb="Continue" />

          {signIn.isError && (
            <ErrorBanner>
              {errorMessage(signIn.error)}{" "}
              {rateLimited(signIn.error) ? "If you’ve forgotten it, " : "Try again or "}
              <Link href="/forgot-password">reset your password</Link>.
            </ErrorBanner>
          )}

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <label className={`tf${signIn.isError ? " err" : ""}`}>
              <span className="tf-l">Email</span>
              <input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <PasswordField
                id="password"
                label="Password"
                autoComplete="current-password"
                required
                error={signIn.isError}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Link href="/forgot-password" style={{ alignSelf: "flex-end", fontWeight: 500 }}>
                Forgot password?
              </Link>
            </div>
            <ActionButton type="submit" variant="filled" pending={signIn.isPending}>
              {signIn.isPending ? "Signing in…" : "Sign in"}
            </ActionButton>
          </form>

          <AuthFooter />
        </div>
      </main>
    </>
  );
}
