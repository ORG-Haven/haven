"use client";

import Link from "next/link";
import { useState } from "react";
import { ActionButton, ENV_STATUS, ErrorState, Icon, Page, PageHeader, PageLoader, ToneAvatar } from "@/components/ui";
import { projectHref } from "@/components/shell/routes";
import type { Environment, Project } from "@/lib/api/types";
import { errorMessage, hostFor } from "@/lib/format";
import { useEnvironments, useHvnYaml, useUpdateHostname } from "@/lib/queries";
import { ProjectGate } from "./ProjectGate";

export function EnvironmentsView({ projectId }: { projectId: string }) {
  return <ProjectGate projectId={projectId}>{(p) => <Environments project={p} />}</ProjectGate>;
}

const AGENT_PROMPTS = [
  "Add a preview env that runs before qa",
  "Drop uat and require my approval for staging",
  "Only promote to prod on weekdays",
];

function Environments({ project }: { project: Project }) {
  const envs = useEnvironments(project.id);
  const yaml = useHvnYaml(project.id);

  if (envs.isPending) return <PageLoader />;
  if (envs.isError) return <ErrorState message={errorMessage(envs.error)} onRetry={() => envs.refetch()} />;

  return (
    <Page>
      <PageHeader
        title="Environments"
        subtitle={<>Defined in your <span className="mono">hvn.yaml</span>. Change each hostname here; the domain is fixed for the project.</>}
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span className="chip"><Icon name="lock" /><span className="mono">{project.domain}</span></span>
            <Link className="btn textb" href={projectHref(project.id, "settings")}>Change in Settings</Link>
          </div>
        }
      />

      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 className="tm">Environments <span className="v" style={{ fontWeight: 400 }}>· {envs.data.length}</span></h2>
        <div className="list">
          {/* Keyed on the saved hostname so the draft resets when the server value changes. */}
          {envs.data.map((e) => <EnvironmentRow key={`${e.name}:${e.hostname}`} projectId={project.id} domain={project.domain} env={e} />)}
        </div>
      </section>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
        <section className="card-o" style={{ flex: "2 1 480px", minWidth: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px 12px 20px", borderBottom: "1px solid var(--outline-v)" }}>
            <Icon name="description" className="v" />
            <h2 className="tm mono" style={{ flex: 1 }}>hvn.yaml</h2>
            <span className="tag t-n"><Icon name="visibility" />Read only · from {project.branch}</span>
          </div>
          <div className="mono" style={{ padding: "16px 0", fontSize: 13, lineHeight: "22px", overflowX: "auto", background: "var(--sc-low)" }}>
            {yaml.isPending && <div className="bm v" style={{ padding: "0 20px" }}>Loading…</div>}
            {yaml.isError && <div className="bm err-text" style={{ padding: "0 20px" }}>{errorMessage(yaml.error)}</div>}
            {yaml.data?.split("\n").map((line, i) => (
              <div key={i} style={{ display: "flex", whiteSpace: "pre" }}>
                <span style={{ width: 44, flex: "none", textAlign: "right", paddingRight: 16, color: "var(--outline)" }}>{i + 1}</span>
                <span style={{ color: yamlColor(line) }}>{line}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card-f" style={{ flex: "1 1 300px", minWidth: 0, padding: 24, display: "flex", flexDirection: "column", gap: 16, background: "var(--pri-c)", color: "var(--on-pri-c)" }}>
          <span className="av" style={{ background: "var(--pri)", color: "var(--on-pri)" }}><Icon name="smart_toy" /></span>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <h2 className="tm">Change environments</h2>
            <span className="bm">Ask your coding agent. The hvn plugin edits <span className="mono">hvn.yaml</span>, and the change applies on your next push. Try:</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
            {AGENT_PROMPTS.map((p) => (
              <span key={p} className="chip" style={{ borderColor: "var(--on-pri-c)", color: "var(--on-pri-c)" }}>
                <Icon name="chat_bubble" style={{ color: "var(--on-pri-c)" }} />
                {p}
              </span>
            ))}
          </div>
        </section>
      </div>
    </Page>
  );
}

function yamlColor(line: string) {
  if (line.trimStart().startsWith("#")) return "var(--on-surf-v)";
  if (line.includes("promote:")) return "var(--ok)";
  if (/^\w/.test(line) && line.endsWith(":")) return "var(--pri)";
  return "var(--on-surf)";
}

function EnvironmentRow({ projectId, domain, env }: { projectId: string; domain: string; env: Environment }) {
  const update = useUpdateHostname(projectId);
  const [draft, setDraft] = useState(env.hostname);
  const dirty = draft !== env.hostname;
  const status = ENV_STATUS[env.status];

  const save = () => update.mutate({ env: env.name, hostname: draft });
  const cancel = () => {
    setDraft(env.hostname);
    update.reset();
  };

  return (
    <div className="li" style={{ flexWrap: "wrap", alignItems: "flex-start", padding: "16px 24px 16px 16px" }}>
      <div style={{ flex: "0 1 240px", display: "flex", alignItems: "center", gap: 16, minHeight: 56 }}>
        <ToneAvatar tone={status.tone} icon={status.icon} />
        <span className="li-t">
          <span className="bl mono">{env.name}</span>
          <span className="bm v">{env.summary}{env.version && <> · <span className="mono">{env.version}</span></>}</span>
        </span>
      </div>
      <div style={{ flex: "1 1 400px", minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <label className="tf" style={{ flex: "1 1 280px", minWidth: 0 }}>
            <span className="tf-l">Hostname</span>
            <span className="tf-box">
              <input
                type="text"
                value={draft}
                placeholder="(root)"
                aria-label={`Hostname for ${env.name}`}
                aria-invalid={update.isError || undefined}
                onChange={(e) => setDraft(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && dirty) save();
                  if (e.key === "Escape") cancel();
                }}
              />
              <span className="sfx"><Icon name="lock" size={16} />{draft ? `.${domain}` : domain}</span>
            </span>
          </label>
          {dirty ? (
            <div style={{ display: "flex", gap: 4 }}>
              <button className="btn textb" onClick={cancel} disabled={update.isPending}>Cancel</button>
              <ActionButton variant="filled" pending={update.isPending} onClick={save}>Save</ActionButton>
            </div>
          ) : (
            <a className="btn textb" href={env.url} target="_blank" rel="noreferrer" aria-disabled={env.status === "not_deployed"}>
              <Icon name="open_in_new" />
              Open
            </a>
          )}
        </div>
        {update.isError ? (
          <span className="tf-s err-text" role="alert">{errorMessage(update.error)}</span>
        ) : dirty ? (
          <span className="tf-s">Will be served at <span className="mono">{hostFor(draft, domain)}</span>. No DNS change needed — the wildcard record covers it.</span>
        ) : (
          <span className="tf-s mono">{env.url}</span>
        )}
      </div>
    </div>
  );
}
