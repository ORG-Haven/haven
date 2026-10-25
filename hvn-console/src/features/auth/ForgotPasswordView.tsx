"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ActionButton, Icon } from "@/components/ui";
import { errorMessage } from "@/lib/format";
import { useRequestPasswordReset } from "@/lib/queries";
import { AuthBrand, ErrorBanner, isEmail } from "./parts";

export function ForgotPasswordView() {
  const reset = useRequestPasswordReset();
  const [email, setEmail] = useState("");
  const [tried, setTried] = useState(false);
  const invalid = tried && !isEmail(email);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (isEmail(email)) reset.mutate(email);
  };

  return (
    <main className="auth-center">
      <div className="auth-col">
        <AuthBrand className="" />

        {reset.isSuccess ? (
          <div role="status" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div className="auth-hero"><Icon name="mail" size={30} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <h1 className="auth-title">Check your inbox</h1>
              <p className="v" style={{ margin: 0 }}>
                If an account exists for <strong>{reset.variables}</strong>, a link to reset your password is on its way.
              </p>
            </div>
            <button type="button" className="btn textb" style={{ alignSelf: "flex-start", marginLeft: -12 }} onClick={() => reset.reset()}>
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <h1 className="auth-title">Reset your password</h1>
              <p className="v" style={{ margin: 0 }}>
                Enter the email you use for Haven and we’ll send you a link to set a new password.
              </p>
            </div>
            {reset.isError && <ErrorBanner>{errorMessage(reset.error)}</ErrorBanner>}
            <label className={`tf${invalid ? " err" : ""}`}>
              <span className="tf-l">Email</span>
              <input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={invalid || undefined}
              />
              {invalid && <span className="tf-s">Enter a valid email address</span>}
            </label>
            <ActionButton type="submit" variant="filled" pending={reset.isPending}>
              Send reset link
            </ActionButton>
            <p className="v bs" style={{ margin: 0 }}>
              Signed up with Google or GitHub? You don’t have a Haven password — sign in with that provider instead.
            </p>
          </form>
        )}

        <Link href="/signin" className="btn textb" style={{ alignSelf: "flex-start", marginLeft: -12 }}>
          <Icon name="arrow_back" />
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
