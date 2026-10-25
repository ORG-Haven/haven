"use client";

import { useState } from "react";
import { ErrorState, Icon, Page, PageHeader, PageLoader, ToneAvatar, useSnackbar } from "@/components/ui";
import type { Issue, Observability, Project, Tone } from "@/lib/api/types";
import { errorMessage } from "@/lib/format";
import { useObservability } from "@/lib/queries";
import { ProjectGate } from "./ProjectGate";

export function ObservabilityView({ projectId }: { projectId: string }) {
  return <ProjectGate projectId={projectId}>{(p) => <ObservabilityPage project={p} />}</ProjectGate>;
}

const KPI_STYLE: Record<Tone, { color: string; icon: string }> = {
  ok: { color: "var(--ok)", icon: "check_circle" },
  warn: { color: "var(--warn)", icon: "warning" },
  err: { color: "var(--err)", icon: "trending_up" },
  neutral: { color: "var(--on-surf-v)", icon: "info" },
};

function ObservabilityPage({ project }: { project: Project }) {
  const envs = project.environments.map((e) => e.name);
  const [env, setEnv] = useState(envs.at(-1) ?? "");
  const obs = useObservability(project.id, env);
  const [snackbar, toast] = useSnackbar();

  return (
    <Page gap={28}>
      <PageHeader title="Observability" subtitle="How your app is doing, in plain words. Your agent can read this too." />

      <div className="tabs" role="tablist" aria-label="Environment">
        {envs.map((e) => (
          <button key={e} className={`tab mono${e === env ? " on" : ""}`} role="tab" aria-selected={e === env} onClick={() => setEnv(e)}>
            {e}
          </button>
        ))}
      </div>

      {obs.isPending ? (
        <PageLoader label={`Loading ${env} telemetry…`} />
      ) : obs.isError ? (
        <ErrorState message={errorMessage(obs.error)} onRetry={() => obs.refetch()} />
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            {obs.data.kpis.map((k) => {
              const s = KPI_STYLE[k.tone];
              const icon = k.trend === "up" && k.tone === "ok" ? "trending_up" : s.icon;
              return (
                <div key={k.label} className="card-f" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                  <span className="lm v">{k.label}</span>
                  <span style={{ fontSize: 32, lineHeight: "40px" }}>{k.value}</span>
                  <span className="bm" style={{ display: "flex", alignItems: "center", gap: 4, color: s.color }}>
                    <Icon name={icon} size={18} />
                    {k.note}
                  </span>
                </div>
              );
            })}
          </div>

          <RequestsChart obs={obs.data} />

          <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 className="tm">Issues <span className="v" style={{ fontWeight: 400 }}>· {obs.data.issues.length}</span></h2>
            {obs.data.issues.length === 0 ? (
              <div className="card-f" style={{ padding: 20, display: "flex", alignItems: "center", gap: 12 }}>
                <Icon name="check_circle" fill style={{ color: "var(--ok)" }} />
                <span className="bm">No open issues in {env}.</span>
              </div>
            ) : (
              <div className="list">
                {obs.data.issues.map((i) => <IssueRow key={i.id} issue={i} onCopied={toast} />)}
              </div>
            )}
          </section>
        </>
      )}
      {snackbar}
    </Page>
  );
}

function IssueRow({ issue, onCopied }: { issue: Issue; onCopied: (m: string) => void }) {
  const copyPrompt = () =>
    navigator.clipboard
      ?.writeText(`Fix this issue in my app.\n\n${issue.title}\n${issue.detail}\n(${issue.meta})`)
      .then(() => onCopied("Fix prompt copied — paste it into Claude Code"))
      .catch(() => onCopied("Couldn’t copy the prompt"));
  const tone: Tone = issue.severity === "error" ? "err" : "warn";
  return (
    <div className="li" style={{ flexWrap: "wrap", alignItems: "flex-start", padding: "16px 24px 16px 16px" }}>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flex: "1 1 420px", minWidth: 0 }}>
        <ToneAvatar tone={tone} icon={issue.severity === "error" ? "error" : "warning"} />
        <div className="li-t" style={{ gap: 2 }}>
          <span className="bl">{issue.title}</span>
          <span className="bm v">{issue.detail}</span>
          <span className="bs v mono">{issue.meta}</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignSelf: "center" }}>
        <button className="btn textb"><Icon name="timeline" />Traces</button>
        <button className="btn tonal" onClick={copyPrompt}><Icon name="content_copy" />Copy fix prompt</button>
      </div>
    </div>
  );
}

function RequestsChart({ obs }: { obs: Observability }) {
  const pts = obs.requestsPerMinute;
  const max = Math.max(1, ...pts);
  const top = Math.ceil(max / 10) * 10 || 10;
  const X = (i: number) => 40 + (i / (pts.length - 1)) * 710;
  const Y = (v: number) => 170 - (v / top) * 150;
  const line = pts.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(" ");
  const area = `${line} L750 170 L40 170 Z`;
  const deployX = obs.deploy ? X(pts.length - 1 - obs.deploy.hoursAgo) : undefined;
  const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

  return (
    <section className="card-o" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, alignItems: "flex-end" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <h2 className="tm">Requests per minute · last 24h</h2>
          <span className="bm v"><span className="mono">{obs.host}</span>{obs.deploy && " · dashed line marks a deploy"}</span>
        </div>
        <span className="tag t-n">Peak <span className="mono">{fmt(max)}</span></span>
      </div>
      <svg viewBox="0 0 760 220" width="100%" height="220" role="img" aria-label={`Requests per minute for ${obs.host} over the last 24 hours, peaking at ${fmt(max)}`} style={{ display: "block" }}>
        <g fontFamily="var(--font-roboto-mono), monospace" fontSize="11">
          <line x1="40" y1="20" x2="750" y2="20" style={{ stroke: "var(--outline-v)" }} />
          <line x1="40" y1="95" x2="750" y2="95" style={{ stroke: "var(--outline-v)" }} />
          <line x1="40" y1="170" x2="750" y2="170" style={{ stroke: "var(--outline)" }} />
          <text x="32" y="24" textAnchor="end" style={{ fill: "var(--on-surf-v)" }}>{fmt(top)}</text>
          <text x="32" y="99" textAnchor="end" style={{ fill: "var(--on-surf-v)" }}>{fmt(top / 2)}</text>
          <text x="32" y="174" textAnchor="end" style={{ fill: "var(--on-surf-v)" }}>0</text>
          <text x="40" y="192" style={{ fill: "var(--on-surf-v)" }}>24h ago</text>
          <text x="395" y="192" textAnchor="middle" style={{ fill: "var(--on-surf-v)" }}>12h ago</text>
          <text x="750" y="192" textAnchor="end" style={{ fill: "var(--on-surf-v)" }}>now</text>
        </g>
        {deployX !== undefined && obs.deploy && (
          <>
            <line x1={deployX} y1="14" x2={deployX} y2="170" strokeDasharray="3 4" style={{ stroke: "var(--on-surf-v)" }} />
            <text x={deployX} y="210" textAnchor="middle" fontFamily="var(--font-roboto-mono), monospace" fontSize="11" style={{ fill: "var(--on-surf)" }}>{obs.deploy.version}</text>
          </>
        )}
        <path d={area} style={{ fill: "var(--pri)", fillOpacity: 0.12 }} />
        <path d={line} fill="none" strokeWidth="2.5" strokeLinejoin="round" style={{ stroke: "var(--pri)" }} />
      </svg>
    </section>
  );
}
