"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionButton, Icon, Page, Tag } from "@/components/ui";
import type { Project } from "@/lib/api/types";
import { errorMessage } from "@/lib/format";
import { useAgents, useDeleteProject, useRevokeAgent, useUpdateDomain } from "@/lib/queries";
import { ProjectGate } from "./ProjectGate";

export function SettingsView({ projectId }: { projectId: string }) {
  return <ProjectGate projectId={projectId}>{(p) => <Settings project={p} />}</ProjectGate>;
}

const DOMAIN_RE = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/;

function Settings({ project }: { project: Project }) {
  return (
    <Page narrow gap={0}>
      <div style={{ paddingBottom: 32 }}>
        <h1 className="hl">Settings</h1>
        <p className="bl v" style={{ margin: "4px 0 0" }}>Project-wide settings for <span className="mono">{project.name}</span>.</p>
      </div>
      <DomainSection project={project} key={project.domain} />
      <GitSection project={project} />
      <AgentsSection projectId={project.id} />
      <DeleteSection project={project} />
    </Page>
  );
}

function Section({ id, title, description, danger, children }: {
  id?: string;
  title: string;
  description: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="sec" id={id}>
      <div className="sec-h">
        <h2 className="tm" style={danger ? { color: "var(--err)" } : undefined}>{title}</h2>
        <span className="bm v">{description}</span>
      </div>
      <div className="sec-b">{children}</div>
    </section>
  );
}

function DomainSection({ project }: { project: Project }) {
  const update = useUpdateDomain(project.id);
  const [domain, setDomain] = useState(project.domain);
  const clean = domain.trim().toLowerCase();
  const valid = DOMAIN_RE.test(clean);
  const dirty = clean !== project.domain;

  return (
    <Section title="Domain" description="Shared by every environment. Changing it means updating DNS at your provider.">
      <div>
        <label className="tf">
          <span className="tf-l">Project domain</span>
          <input className="mono" type="text" value={domain} onChange={(e) => setDomain(e.target.value)} aria-invalid={!valid || undefined} aria-describedby="domain-help" />
        </label>
        <span id="domain-help" className={`tf-s${!valid || update.isError ? " err-text" : ""}`} role={update.isError ? "alert" : undefined}>
          {!valid ? "Enter a domain like yourapp.com" : update.isError ? errorMessage(update.error) : dirty ? "After saving, point the new domain’s DNS at the gateway IP below." : " "}
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <span className="bm v">Gateway IP <span className="mono" style={{ color: "var(--on-surf)" }}>{project.gatewayIp}</span></span>
        {project.dnsVerified ? <Tag tone="ok" icon="check">DNS verified</Tag> : <Tag tone="warn" icon="schedule">Waiting for DNS</Tag>}
      </div>
      <div>
        <ActionButton variant="tonal" icon="save" pending={update.isPending} disabled={!dirty || !valid} onClick={() => update.mutate(clean)}>
          Save domain
        </ActionButton>
      </div>
    </Section>
  );
}

function GitSection({ project }: { project: Project }) {
  return (
    <Section title="Git repository" description="Pushes to the production branch deploy to the first environment.">
      <div className="list">
        <div className="li">
          <span className="av" style={{ background: "var(--sec-c)", color: "var(--on-sec-c)" }}><Icon name="code" /></span>
          <span className="li-t">
            <a className="bl mono" href={`https://github.com/${project.repo}`} target="_blank" rel="noreferrer">{project.repo}</a>
            <span className="bm v">Connected through the Haven GitHub app</span>
          </span>
          <span className="chip"><Icon name="account_tree" />{project.branch}</span>
        </div>
      </div>
    </Section>
  );
}

function AgentsSection({ projectId }: { projectId: string }) {
  const agents = useAgents(projectId);
  const revoke = useRevokeAgent(projectId);

  return (
    <Section id="agents" title="Agent access" description="Coding agents that can deploy, promote and read telemetry for this project.">
      {agents.isPending ? (
        <span className="bm v">Loading agents…</span>
      ) : agents.isError ? (
        <span className="bm err-text">{errorMessage(agents.error)}</span>
      ) : agents.data.length === 0 ? (
        <div className="card-f" style={{ padding: 16 }}><span className="bm v">No agents connected yet.</span></div>
      ) : (
        <div className="list">
          {agents.data.map((a) => (
            <div key={a.id} className="li">
              <span className="av" style={a.kind === "claude-code" ? { background: "var(--pri-c)", color: "var(--on-pri-c)" } : { background: "var(--sec-c)", color: "var(--on-sec-c)" }}>
                <Icon name={a.kind === "claude-code" ? "smart_toy" : "key"} />
              </span>
              <span className="li-t"><span className="bl">{a.name}</span><span className="bm v">{a.scope}</span></span>
              <ActionButton variant="textb" className="err" pending={revoke.isPending && revoke.variables === a.id} onClick={() => revoke.mutate(a.id)}>
                Revoke
              </ActionButton>
            </div>
          ))}
        </div>
      )}
      {revoke.isError && <span className="bm err-text" role="alert">{errorMessage(revoke.error)}</span>}
      <div>
        <a className="btn filled" href="https://github.com" target="_blank" rel="noreferrer"><Icon name="add_link" />Connect an agent</a>
      </div>
    </Section>
  );
}

function DeleteSection({ project }: { project: Project }) {
  const router = useRouter();
  const del = useDeleteProject();
  const [typed, setTyped] = useState("");
  const confirmed = typed === project.name;

  return (
    <Section
      danger
      title="Delete project"
      description={`Removes all ${project.environments.length} environments, deployment history and telemetry from your cluster. Your GitHub repo is not touched.`}
    >
      <label className="tf">
        <span className="tf-l">Type {project.name} to confirm</span>
        <input className="mono" type="text" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={project.name} autoComplete="off" />
      </label>
      {del.isError && <span className="bm err-text" role="alert">{errorMessage(del.error)}</span>}
      <div>
        <ActionButton
          variant="danger"
          icon="delete_forever"
          pending={del.isPending}
          disabled={!confirmed}
          onClick={() => del.mutate(project.id, { onSuccess: () => router.push("/projects") })}
        >
          Delete {project.name}
        </ActionButton>
      </div>
    </Section>
  );
}
