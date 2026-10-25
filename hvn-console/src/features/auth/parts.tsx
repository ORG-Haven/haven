"use client";

import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { HarborLogo, Icon } from "@/components/ui";
import { errorMessage } from "@/lib/format";
import { useSignInWithProvider } from "@/lib/queries";
import type { OAuthProvider } from "@/lib/api/types";

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

/** Logo above the form, shown only when the brand panel is hidden. */
export function AuthBrand({ className = "auth-m-brand" }: { className?: string }) {
  return (
    <span className={`brand ${className}`}>
      <HarborLogo size={32} />
      Haven
    </span>
  );
}

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.68.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

const PROVIDERS: { id: OAuthProvider; label: string; mark: ReactNode }[] = [
  { id: "google", label: "Google", mark: <GoogleMark /> },
  { id: "github", label: "GitHub", mark: <GitHubMark /> },
];

/** "Continue with Google / GitHub", followed by the "or" divider. */
export function ProviderButtons({ verb }: { verb: string }) {
  const router = useRouter();
  const signIn = useSignInWithProvider();
  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {PROVIDERS.map((p) => {
          const pending = signIn.isPending && signIn.variables === p.id;
          return (
            <button
              key={p.id}
              type="button"
              className="btn outlined social"
              disabled={signIn.isPending}
              aria-busy={pending || undefined}
              onClick={() => signIn.mutate(p.id, { onSuccess: () => router.push("/projects") })}
            >
              {pending ? <Icon name="progress_activity" className="spin" size={20} style={{ margin: 0 }} /> : p.mark}
              {verb} with {p.label}
            </button>
          );
        })}
        {signIn.isError && <span className="err-text bs">{errorMessage(signIn.error)}</span>}
      </div>
      <div className="auth-or">OR</div>
    </>
  );
}

export function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <div className="auth-banner" role="alert">
      <Icon name="error" size={20} style={{ marginTop: 0 }} />
      <div>{children}</div>
    </div>
  );
}

/** Outlined password field with a show/hide toggle. */
export function PasswordField({ label, error, ...input }: { label: string; error?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  const [shown, setShown] = useState(false);
  return (
    <div className={`tf pw${error ? " err" : ""}`}>
      <label htmlFor={input.id} className="tf-l">{label}</label>
      <input {...input} type={shown ? "text" : "password"} aria-invalid={error || undefined} />
      <button type="button" className="ib eye" aria-label={shown ? "Hide password" : "Show password"} onClick={() => setShown(!shown)}>
        <Icon name={shown ? "visibility_off" : "visibility"} />
      </button>
    </div>
  );
}

export function AuthFooter() {
  // TODO: point these at the real policy and help pages once they exist.
  return (
    <nav className="auth-foot" aria-label="Legal">
      <a href="#">Terms</a>
      <a href="#">Privacy</a>
      <a href="#">Help</a>
    </nav>
  );
}
