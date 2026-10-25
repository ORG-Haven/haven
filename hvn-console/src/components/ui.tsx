"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { DeploymentStatus, EnvStatus, Tone } from "@/lib/api/types";

export function Icon({ name, fill, size, className, style }: {
  name: string;
  fill?: boolean;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`ic${fill ? " f" : ""}${className ? ` ${className}` : ""}`}
      style={size ? { fontSize: size, ...style } : style}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}

const RING = "M22 12.7A20 20 0 0 0 20 46H44A20 20 0 0 0 42 12.7";

export function HarborLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path className="logo-ring" d={RING} fill="none" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
      <circle className="logo-dot" cx="32" cy="29" r="5.5" />
    </svg>
  );
}

/** Animated Harbor mark shown in the content area while a page's data loads. */
export function PageLoader({ label = "Loading Haven…" }: { label?: string }) {
  return (
    <div className="ld" role="status" aria-live="polite">
      <svg width="88" height="88" viewBox="0 0 64 64" aria-hidden="true">
        <path className="ld-ring" pathLength={100} d={RING} fill="none" strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round" />
        <circle className="ld-ripple" cx="32" cy="29" r="5.5" />
        <circle className="ld-dot" cx="32" cy="29" r="5.5" />
      </svg>
      <span className="sr">{label}</span>
    </div>
  );
}

export function Page({ children, narrow, gap }: { children: ReactNode; narrow?: boolean; gap?: number }) {
  return (
    <main className="page" style={{ ...(narrow ? { maxWidth: 1080 } : null), ...(gap !== undefined ? { gap } : null) }}>
      {children}
    </main>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="phead">
      <div>
        <h1 className="hl">{title}</h1>
        {subtitle && <p className="bl v" style={{ margin: "4px 0 0" }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div>}
    </div>
  );
}

export function ErrorState({ title = "Couldn’t load this page", message, onRetry }: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <Page>
      <div className="state">
        <Icon name="cloud_off" />
        <h1 className="tl">{title}</h1>
        {message && <p className="bm v" style={{ margin: 0 }}>{message}</p>}
        {onRetry && (
          <button className="btn tonal" onClick={onRetry}>
            <Icon name="refresh" />
            Try again
          </button>
        )}
      </div>
    </Page>
  );
}

export function NotFoundState({ what }: { what: string }) {
  return (
    <Page>
      <div className="state">
        <Icon name="search_off" />
        <h1 className="tl">{what} not found</h1>
        <p className="bm v" style={{ margin: 0 }}>It may have been deleted, or the link is wrong.</p>
        <Link className="btn tonal" href="/projects">
          <Icon name="arrow_back" />
          All projects
        </Link>
      </div>
    </Page>
  );
}

const TONE_CLASS: Record<Tone, string> = { ok: "t-ok", warn: "t-warn", err: "t-err", neutral: "t-n" };

export function Tag({ tone, icon, children, style }: { tone: Tone; icon?: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <span className={`tag ${TONE_CLASS[tone]}`} style={style}>
      {icon && <Icon name={icon} />}
      {children}
    </span>
  );
}

export const ENV_STATUS: Record<EnvStatus, { tone: Tone; icon: string; dot: string }> = {
  healthy: { tone: "ok", icon: "check", dot: "var(--ok)" },
  waiting: { tone: "warn", icon: "hourglass_top", dot: "var(--warn)" },
  failed: { tone: "err", icon: "error", dot: "var(--err)" },
  not_deployed: { tone: "neutral", icon: "radio_button_unchecked", dot: "var(--outline)" },
};

export const DEPLOY_STATUS: Record<DeploymentStatus, { tone: Tone; icon: string; label: string }> = {
  succeeded: { tone: "ok", icon: "check", label: "Succeeded" },
  failed: { tone: "err", icon: "error", label: "Failed" },
  awaiting_approval: { tone: "warn", icon: "hourglass_top", label: "Awaiting acceptance" },
  rejected: { tone: "neutral", icon: "block", label: "Rejected" },
};

const AVATAR_STYLE: Record<Tone, CSSProperties> = {
  ok: { background: "var(--ok-c)", color: "var(--on-ok-c)" },
  warn: { background: "var(--warn-c)", color: "var(--on-warn-c)" },
  err: { background: "var(--err-c)", color: "var(--on-err-c)" },
  neutral: { background: "var(--sc-highest)", color: "var(--on-surf-v)" },
};

export function ToneAvatar({ tone, icon }: { tone: Tone; icon: string }) {
  return (
    <span className="av" style={AVATAR_STYLE[tone]}>
      <Icon name={icon} />
    </span>
  );
}

export function ProjectAvatar({ name, color, size = 40 }: { name: string; color: string; size?: number }) {
  return (
    <span
      className="av"
      style={{ width: size, height: size, borderRadius: size / 4, background: color, color: "#FFFFFF", fontSize: size * 0.4 }}
      aria-hidden="true"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

/** Button that shows a spinner and blocks repeat clicks while its mutation runs. */
export function ActionButton({ variant, icon, pending, children, ...rest }: {
  variant: "filled" | "tonal" | "outlined" | "textb" | "danger";
  icon?: string;
  pending?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...rest} className={`btn ${variant}${rest.className ? ` ${rest.className}` : ""}`} disabled={pending || rest.disabled} aria-busy={pending || undefined}>
      {pending ? <Icon name="progress_activity" className="spin" /> : icon && <Icon name={icon} />}
      {children}
    </button>
  );
}

export function useSnackbar() {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(t);
  }, [message]);
  const show = useCallback((m: string) => setMessage(m), []);
  const node = message ? (
    <div className="snackbar" role="status" aria-live="polite">
      <span style={{ flex: 1 }}>{message}</span>
      <button className="ib" aria-label="Dismiss" onClick={() => setMessage(null)}>
        <Icon name="close" />
      </button>
    </div>
  ) : null;
  return [node, show] as const;
}
