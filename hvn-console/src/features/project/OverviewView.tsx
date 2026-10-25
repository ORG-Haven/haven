"use client";

import Link from "next/link";
import { ActionButton, DEPLOY_STATUS, ENV_STATUS, ErrorState, Icon, Page, PageLoader, ProjectAvatar, Tag, ToneAvatar, useSnackbar } from "@/components/ui";
import { projectHref } from "@/components/shell/routes";
import type { Pipeline, Project } from "@/lib/api/types";
import { errorMessage, formatDate, timeAgo } from "@/lib/format";
import { useAcceptPromotion, useDeployments, usePipeline, useRedeploy, useRejectPromotion } from "@/lib/queries";
import { ProjectGate } from "./ProjectGate";

export function OverviewView({ projectId }: { projectId: string }) {
  return <ProjectGate projectId={projectId}>{(p) => <Overview project={p} />}</ProjectGate>;
}

function Overview({ project }: { project: Project }) {
  const pipeline = usePipeline(project.id);
  const deployments = useDeployments(project.id);
  const redeploy = useRedeploy(project.id);
  const [snackbar, toast] = useSnackbar();
  const firstEnv = project.environments[0]?.name;
  const prod = pipeline.data?.stages.at(-1);

  if (pipeline.isPending || deployments.isPending) return <PageLoader />;
  if (pipeline.isError) return <ErrorState message={errorMessage(pipeline.error)} onRetry={() => pipeline.refetch()} />;

  return (
    <Page>
      <div className="phead" style={{ alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <ProjectAvatar name={project.name} color={project.color} size={64} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h1 className="hl">{project.name}</h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <a className="chip" href={`https://github.com/${project.repo}`} target="_blank" rel="noreferrer"><Icon name="code" />{project.repo}</a>
              <span className="chip"><Icon name="account_tree" />{project.branch}</span>
              <span className="chip"><Icon name="bolt" />{project.framework}</span>
              <span className="chip"><Icon name="calendar_today" />Created {formatDate(project.createdAt)}</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {prod?.status !== "not_deployed" && prod && (
            <a className="btn outlined" href={prod.url} target="_blank" rel="noreferrer"><Icon name="open_in_new" />Visit {prod.name}</a>
          )}
          {firstEnv && (
            <ActionButton
              variant="filled"
              icon="refresh"
              pending={redeploy.isPending}
              onClick={() => redeploy.mutate(firstEnv, {
                onSuccess: () => toast(`Redeployed ${firstEnv}`),
                onError: (e) => toast(errorMessage(e)),
              })}
            >
              Redeploy {firstEnv}
            </ActionButton>
          )}
        </div>
      </div>

      <DomainSection project={project} />
      <PipelineSection projectId={project.id} pipeline={pipeline.data} toast={toast} />

      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h2 className="tl">Recent deployments</h2>
          <Link className="btn textb" href={projectHref(project.id, "deployments")}>View all<Icon name="arrow_forward" style={{ margin: "0 -4px 0 0" }} /></Link>
        </div>
        {deployments.isError ? (
          <span className="bm err-text">{errorMessage(deployments.error)}</span>
        ) : deployments.data.length === 0 ? (
          <div className="card-f" style={{ padding: 20 }}><span className="bm v">No deployments yet. Push to {project.branch} to deploy.</span></div>
        ) : (
          <div className="list">
            {deployments.data.slice(0, 3).map((d) => {
              const s = DEPLOY_STATUS[d.status];
              return (
                <Link key={d.id} className="li sl" href={`${projectHref(project.id, "deployments")}?d=${d.id}`}>
                  <ToneAvatar tone={s.tone} icon={s.icon} />
                  <span className="li-t">
                    <span className="bl">{d.message}</span>
                    <span className="bm v"><span className="mono">{d.sha}</span> · {d.triggeredBy}</span>
                  </span>
                  <span className="tag t-n mono">{d.env}</span>
                  <Tag tone={s.tone} style={{ width: 150, justifyContent: "center" }}>{s.label}</Tag>
                  <span className="bm v" style={{ width: 72, textAlign: "right" }}>{timeAgo(d.createdAt)}</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
      {snackbar}
    </Page>
  );
}

function DomainSection({ project }: { project: Project }) {
  const copyIp = () => navigator.clipboard?.writeText(project.gatewayIp).catch(() => undefined);
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h2 className="tl">Domain &amp; DNS</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <div className="card-f" style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="lm v">Project domain</span>
          <span className="mono" style={{ fontSize: 18, lineHeight: "28px" }}>{project.domain}</span>
        </div>
        <div className="card-f" style={{ padding: "16px 12px 16px 20px", display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="lm v">Gateway IP · point your DNS here</span>
          <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, height: 28 }}>
            <span className="mono" style={{ fontSize: 18, lineHeight: "28px" }}>{project.gatewayIp}</span>
            <button className="ib" aria-label="Copy gateway IP" onClick={copyIp}><Icon name="content_copy" size={20} /></button>
          </span>
        </div>
        <div className="card-f" style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="lm v">Status</span>
          <span style={{ height: 28, display: "flex", alignItems: "center" }}>
            {project.dnsVerified
              ? <Tag tone="ok" icon="check_circle">DNS verified · TLS active</Tag>
              : <Tag tone="warn" icon="hourglass_top">Waiting for DNS records</Tag>}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span className="bm v">Add these records at your domain provider:</span>
        <div className="list" style={{ overflowX: "auto" }}>
          <table className="tbl">
            <colgroup><col style={{ width: 100 }} /><col style={{ width: 120 }} /><col /><col style={{ width: 160 }} /></colgroup>
            <thead><tr><th className="th">Type</th><th className="th">Name</th><th className="th">Value</th><th className="th">Status</th></tr></thead>
            <tbody>
              {project.dnsRecords.map((r) => (
                <tr key={r.name}>
                  <td className="td mono">{r.type}</td>
                  <td className="td mono">{r.name}</td>
                  <td className="td mono">{r.value}</td>
                  <td className="td">{r.found ? <Tag tone="ok" icon="check">Found</Tag> : <Tag tone="warn" icon="schedule">Not found yet</Tag>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function PipelineSection({ projectId, pipeline, toast }: { projectId: string; pipeline: Pipeline; toast: (m: string) => void }) {
  const accept = useAcceptPromotion(projectId);
  const reject = useRejectPromotion(projectId);
  const pending = pipeline.pending;
  const busy = accept.isPending || reject.isPending;

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h2 className="tl">Promotion pipeline</h2>
          <Link className="btn textb" href={projectHref(projectId, "environments")}>Manage environments<Icon name="arrow_forward" style={{ margin: "0 -4px 0 0" }} /></Link>
        </div>
        <span className="bm v">Each release moves right once its gate is met. Solid line = automatic, dashed = needs a person.</span>
      </div>

      <div className="card-o" style={{ padding: 24, overflowX: "auto" }}>
        <ol className="pipe" style={{ gridTemplateColumns: `repeat(${pipeline.stages.length}, minmax(0, 1fr))`, minWidth: pipeline.stages.length * 180 }}>
          {pipeline.stages.map((stage, i) => {
            const gate = pipeline.gates.find((g) => g.from === stage.name);
            const st = ENV_STATUS[stage.status];
            const waiting = stage.status === "waiting";
            return (
              <li key={stage.name} className="stp">
                <div className="trk">
                  <span className={`node ${waiting ? "t-warn" : stage.status === "failed" ? "t-err" : stage.status === "not_deployed" ? "t-n" : "t-ok"}`}
                    style={waiting ? { boxShadow: "0 0 0 4px color-mix(in srgb, var(--warn) 25%, transparent)" } : undefined}>
                    <Icon name={st.icon} />
                  </span>
                  {gate && i < pipeline.stages.length - 1 && (
                    <>
                      <span className={`ln${gate.mode === "manual" ? " man" : ""}`} />
                      <span className="gchip">
                        <Icon name={gate.mode === "auto" ? "bolt" : "person"} style={{ color: gate.mode === "auto" ? "var(--ok)" : "var(--warn)" }} />
                        {gate.label}
                      </span>
                      <span className={`ln${gate.mode === "manual" ? " man" : ""}`} />
                    </>
                  )}
                </div>
                <div className="stp-b">
                  <strong className="tm mono">{stage.name}</strong>
                  <span className="bm v mono">{stage.version ? `${stage.version} · ${stage.sha}` : "—"}</span>
                  <span className="bm" style={waiting ? { color: "var(--warn)", fontWeight: 500 } : { color: "var(--on-surf-v)" }}>
                    {waiting ? "Waiting for you" : stage.summary}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {pending && (
        <div className="card-f" style={{ padding: "16px 16px 16px 20px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 }}>
          <ToneAvatar tone="warn" icon="hourglass_top" />
          <div style={{ flex: "1 1 360px", display: "flex", flexDirection: "column" }}>
            <span className="ts">{pending.version} is waiting in {pending.env.toUpperCase()}</span>
            <span className="bm v">
              Try it at <a href={pending.url} target="_blank" rel="noreferrer">{pending.url.replace("https://", "")}</a>, then accept to promote it to {pending.nextEnv}.
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <ActionButton variant="textb" pending={reject.isPending} disabled={busy}
              onClick={() => reject.mutate(pending.deploymentId, {
                onSuccess: () => toast(`${pending.version} rejected — it stays in ${pending.env}`),
                onError: (e) => toast(errorMessage(e)),
              })}>
              Reject
            </ActionButton>
            <ActionButton variant="filled" icon="check" pending={accept.isPending} disabled={busy}
              onClick={() => accept.mutate(pending.deploymentId, {
                onSuccess: () => toast(`${pending.version} promoted to ${pending.nextEnv}`),
                onError: (e) => toast(errorMessage(e)),
              })}>
              Accept &amp; promote
            </ActionButton>
          </div>
        </div>
      )}
    </section>
  );
}
