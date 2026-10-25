"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ActionButton, DEPLOY_STATUS, ErrorState, Icon, Page, PageHeader, PageLoader, Tag, ToneAvatar, useSnackbar } from "@/components/ui";
import type { Deployment, Project, StepStatus, Tone } from "@/lib/api/types";
import { duration, errorMessage, timeAgo } from "@/lib/format";
import { useDeployments, useRollback } from "@/lib/queries";
import { ProjectGate } from "./ProjectGate";

export function DeploymentsView({ projectId }: { projectId: string }) {
  return <ProjectGate projectId={projectId}>{(p) => <Deployments project={p} />}</ProjectGate>;
}

const STEP_ICON: Record<StepStatus, { icon: string; color: string }> = {
  done: { icon: "check_circle", color: "var(--ok)" },
  failed: { icon: "error", color: "var(--err)" },
  waiting: { icon: "hourglass_top", color: "var(--warn)" },
  skipped: { icon: "do_not_disturb_on", color: "var(--on-surf-v)" },
};

const LOG_COLOR: Record<Tone, string> = { ok: "var(--ok)", warn: "var(--warn)", err: "var(--err)", neutral: "var(--on-surf)" };

function Deployments({ project }: { project: Project }) {
  const deployments = useDeployments(project.id);
  const params = useSearchParams();
  const router = useRouter();
  const [env, setEnv] = useState("all");

  if (deployments.isPending) return <PageLoader />;
  if (deployments.isError) return <ErrorState message={errorMessage(deployments.error)} onRetry={() => deployments.refetch()} />;

  const all = deployments.data;
  const rows = all.filter((d) => env === "all" || d.env === env);
  const selected = all.find((d) => d.id === params.get("d")) ?? rows[0];
  const select = (id: string) => router.replace(`?d=${id}`, { scroll: false });
  const filters = ["all", ...project.environments.map((e) => e.name)];

  return (
    <Page gap={24}>
      <PageHeader title="Deployments" subtitle="Every release, every environment. Pick one to see what happened." />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }} role="group" aria-label="Filter by environment">
        {filters.map((f) => {
          const on = f === env;
          return (
            <button key={f} className={`chip${on ? " sel" : ""}`} aria-pressed={on} onClick={() => setEnv(f)}>
              {on && <Icon name="check" />}
              {f === "all" ? "All" : f}
            </button>
          );
        })}
      </div>

      {all.length === 0 ? (
        <div className="card-f state">
          <Icon name="rocket_launch" />
          <span className="tm">No deployments yet</span>
          <span className="bm v">Push to {project.branch} and the first one shows up here.</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 32, alignItems: "flex-start" }}>
          <section style={{ flex: "1 1 380px", minWidth: 0 }} aria-label="Deployment history">
            <div className="list">
              {rows.map((d) => {
                const s = DEPLOY_STATUS[d.status];
                const isSel = d.id === selected?.id;
                return (
                  <button key={d.id} className="row" aria-current={isSel || undefined} onClick={() => select(d.id)}
                    style={isSel ? { background: "var(--sec-c)", color: "var(--on-sec-c)" } : undefined}>
                    <ToneAvatar tone={s.tone} icon={s.icon} />
                    <span className="li-t">
                      <span className="bl" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.message}</span>
                      <span className="bm v"><span className="mono">{d.env}</span> · <span className="mono">{d.sha}</span> · {d.triggeredBy}</span>
                    </span>
                    <span className="bs v" style={{ flex: "none" }}>{timeAgo(d.createdAt)}</span>
                  </button>
                );
              })}
              {rows.length === 0 && <div className="li bm v">No deployments to {env} yet.</div>}
            </div>
          </section>
          {selected && <DeploymentDetail projectId={project.id} d={selected} key={selected.id} />}
        </div>
      )}
    </Page>
  );
}

function DeploymentDetail({ projectId, d }: { projectId: string; d: Deployment }) {
  const rollback = useRollback(projectId);
  const [snackbar, toast] = useSnackbar();
  const s = DEPLOY_STATUS[d.status];
  const gateTone: Tone = d.gate.result === "passed" ? "ok" : d.gate.result === "pending" ? "warn" : "err";
  const gateIcon = d.gate.result === "passed" ? "check_circle" : d.gate.result === "pending" ? "hourglass_top" : "block";

  const copyLogs = () =>
    navigator.clipboard
      ?.writeText(`Deployment ${d.id} (${d.env}, ${d.sha}) — ${s.label}\n${d.logs.map((l) => l.text).join("\n")}`)
      .then(() => toast("Logs copied — paste them to your agent"))
      .catch(() => toast("Couldn’t copy logs"));

  return (
    <section className="card-o" style={{ flex: "1.3 1 460px", minWidth: 0, padding: 24, display: "flex", flexDirection: "column", gap: 28 }} aria-live="polite">
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
          <span><Tag tone={s.tone} icon={s.icon}>{s.label}</Tag></span>
          <h2 className="tl">{d.message}</h2>
          <span className="bm v">Deployed to <span className="mono">{d.env}</span> · {timeAgo(d.createdAt)} · took {duration(d.durationSec)}</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {d.status === "succeeded" && (
            <ActionButton variant="outlined" icon="history" pending={rollback.isPending}
              onClick={() => rollback.mutate(d.id, {
                onSuccess: () => toast(`${d.env} rolled back to ${d.version}`),
                onError: (e) => toast(errorMessage(e)),
              })}>
              Roll back to this
            </ActionButton>
          )}
          <a className="btn textb" href={`https://github.com/commit/${d.sha}`} target="_blank" rel="noreferrer"><Icon name="open_in_new" />Commit</a>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16 }}>
        {[["Commit", d.sha, true], ["Version", d.version, true], ["Triggered by", d.triggeredBy, false], ["Came from", d.from, true]].map(([label, value, mono]) => (
          <div key={String(label)} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="lm v">{label}</span>
            <span className={`bl${mono ? " mono" : ""}`}>{value}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h3 className="tm">Promotion gate</h3>
        <div className="card-f" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <Icon name={gateIcon} style={{ color: LOG_COLOR[gateTone] }} />
          <span className="bm">{d.gate.text}</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h3 className="tm">What happened</h3>
        <ol className="list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {d.steps.map((step) => (
            <li key={step.name} className="li" style={{ minHeight: 52 }}>
              <Icon name={STEP_ICON[step.status].icon} style={{ color: STEP_ICON[step.status].color }} />
              <span className="bm" style={{ flex: 1 }}>{step.name}</span>
              <span className="bs v mono">{step.status === "skipped" ? "skipped" : step.duration}</span>
            </li>
          ))}
        </ol>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 className="tm">Logs</h3>
          <button className="btn textb" onClick={copyLogs}><Icon name="content_copy" />Copy for my agent</button>
        </div>
        <div className="mono" style={{ background: "var(--sc-highest)", borderRadius: 12, padding: 16, fontSize: 13, lineHeight: "22px", overflowX: "auto" }}>
          {d.logs.map((l, i) => (
            <div key={i} style={{ whiteSpace: "pre", color: LOG_COLOR[l.tone ?? "neutral"] }}>{l.text}</div>
          ))}
        </div>
      </div>
      {snackbar}
    </section>
  );
}
