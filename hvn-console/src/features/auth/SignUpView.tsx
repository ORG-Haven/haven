"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ActionButton, Icon } from "@/components/ui";
import { errorMessage } from "@/lib/format";
import { useSignUp } from "@/lib/queries";
import { AuthPanel } from "./AuthPanel";
import { AuthBrand, AuthFooter, ErrorBanner, PasswordField, ProviderButtons, isEmail } from "./parts";

const RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Contains a letter", test: (p: string) => /[a-zA-Z]/.test(p) },
  { label: "Contains a number", test: (p: string) => /[0-9]/.test(p) },
];

export function SignUpView() {
  const router = useRouter();
  const signUp = useSignUp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  // Field errors stay hidden until the first submit attempt.
  const [tried, setTried] = useState(false);

  const errors = {
    name: !name.trim() ? "Enter your name" : null,
    email: !isEmail(email) ? "Enter a valid email address" : null,
    password: RULES.every((r) => r.test(password)) ? null : "Password doesn’t meet the requirements",
    terms: agreed ? null : "Accept the terms to continue",
  };
  const show = (key: keyof typeof errors) => (tried ? errors[key] : null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (Object.values(errors).some(Boolean)) return;
    signUp.mutate(
      { name, email, password },
      { onSuccess: ({ email }) => router.push(`/verify-email?email=${encodeURIComponent(email)}`) },
    );
  };

  return (
    <>
      <AuthPanel />
      <main className="auth-main">
        <div className="auth-col">
          <AuthBrand />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h1 className="auth-title">Create your account</h1>
            <p className="v" style={{ margin: 0 }}>
              Already have one? <Link href="/signin">Sign in</Link>
            </p>
          </div>

          <ProviderButtons verb="Sign up" />

          {signUp.isError && (
            <ErrorBanner>
              {errorMessage(signUp.error)} <Link href="/signin">Sign in instead</Link>.
            </ErrorBanner>
          )}

          <form onSubmit={submit} noValidate style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <label className={`tf${show("name") ? " err" : ""}`}>
              <span className="tf-l">Full name</span>
              <input type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!show("name") || undefined} />
              {show("name") && <span className="tf-s">{show("name")}</span>}
            </label>
            <label className={`tf${show("email") ? " err" : ""}`}>
              <span className="tf-l">Email</span>
              <input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!show("email") || undefined}
              />
              {show("email") && <span className="tf-s">{show("email")}</span>}
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <PasswordField
                id="new-password"
                label="Password"
                autoComplete="new-password"
                aria-describedby="password-rules"
                error={!!show("password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <ul className="pw-rules" id="password-rules">
                {RULES.map((r) => {
                  const ok = r.test(password);
                  return (
                    <li key={r.label} className={ok ? "ok" : undefined}>
                      <Icon name={ok ? "check_circle" : "radio_button_unchecked"} fill={ok} />
                      {r.label}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label className="auth-chk">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                {/* TODO: link the real Terms of Service and Privacy Policy. */}
                <span>
                  I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
                </span>
              </label>
              {show("terms") && <span className="err-text bs" style={{ paddingLeft: 30 }}>{show("terms")}</span>}
            </div>
            <ActionButton type="submit" variant="filled" pending={signUp.isPending}>
              {signUp.isPending ? "Creating account…" : "Create account"}
            </ActionButton>
          </form>

          <AuthFooter />
        </div>
      </main>
    </>
  );
}
