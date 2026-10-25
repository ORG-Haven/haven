"use client";

import Link from "next/link";
import { useState } from "react";
import { ENV_STATUS, ErrorState, Icon, Page, PageHeader, PageLoader, ProjectAvatar, Tag } from "@/components/ui";
import { projectHref } from "@/components/shell/routes";
import type { ProjectSummary } from "@/lib/api/types";
import { errorMessage, timeAgo } from "@/lib/format";
import { useCluster, useProjects } from "@/lib/queries";

const PLUGIN_COMMAND = "/plugin install hvn";

export function ProjectsView() {
  const projects = useProjects();
  const cluster = useCluster();

  if (projects.isPending) return <PageLoader />;
  if (projects.isError) return <ErrorState message={errorMessage(projects.error)} onRetry={() => projects.refetch()} />;

  return (
    <Page>
      <PageHeader
        title="Projects"
        subtitle={<>Every app you ship to <span className="mono">{cluster.data?.name ?? "your cluster"}</span>. Push code, we handle the rest.</>}
        actions={
          <Link className="btn filled" href="/projects/new">
            <Icon name="add" />
            New project
          </Link>
        }
      />

      <AgentBanner />

      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 className="tm">
          Projects <span className="v" style={{ fontWeight: 400 }}>· {projects.data.length}</span>
        </h2>
        {projects.data.length === 0 ? (
          <div className="card-f state">
            <Icon name="rocket_launch" />
            <span className="tm">No projects yet</span>
            <Link className="btn filled" href="/projects/new"><Icon name="add" />Import a GitHub repo</Link>
          </div>
        ) : (
          <div className="list" style={{ overflowX: "auto" }}>
            {projects.data.map((p) => <ProjectRow key={p.id} project={p} />)}
          </div>
        )}
      </section>

      <GetStarted />
    </Page>
  );
}

function AgentBanner() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(PLUGIN_COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the command is still visible to copy by hand.
    }
  };
  return (
    <section className="card-f" style={{ background: "var(--pri-c)", color: "var(--on-pri-c)", padding: "20px 24px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "16px 24px" }}>
      <span className="av" style={{ background: "var(--pri)", color: "var(--on-pri)" }}><Icon name="terminal" /></span>
      <div style={{ flex: "1 1 320px", display: "flex", flexDirection: "column", gap: 2 }}>
        <span className="tm">Let your coding agent drive</span>
        <span className="bm">Install the hvn plugin in Claude Code and it can create projects, edit environments and promote releases for you.</span>
      </div>
      <code className="mono" style={{ padding: "8px 16px", borderRadius: 8, background: "var(--surf)", color: "var(--on-surf)", fontSize: 14 }}>{PLUGIN_COMMAND}</code>
      <button className="btn filled" onClick={copy}>
        <Icon name={copied ? "check" : "content_copy"} />
        {copied ? "Copied" : "Copy"}
      </button>
    </section>
  );
}

function ProjectRow({ project: p }: { project: ProjectSummary }) {
  const status =
    p.pendingApprovals > 0 ? <Tag tone="warn" icon="hourglass_top">{p.pendingApprovals} approval{p.pendingApprovals > 1 ? "s" : ""}</Tag>
    : p.health === "failing" ? <Tag tone="err" icon="error">{p.environments.find((e) => e.status === "failed")?.name} failed</Tag>
    : <Tag tone="ok" icon="check">Healthy</Tag>;

  return (
    <div className="li" style={{ minWidth: 860 }}>
      <Link href={projectHref(p.id)} style={{ display: "flex", alignItems: "center", gap: 16, flex: "1 1 240px", minWidth: 0 }}>
        <ProjectAvatar name={p.name} color={p.color} />
        <span className="li-t">
          <span className="bl">{p.name}</span>
          <span className="bm v mono">{p.repo} · {p.branch}</span>
        </span>
      </Link>
      <span className="mono bm" style={{ width: 150 }}>{p.domain}</span>
      <span className="lm v" style={{ width: 230, display: "flex", flexWrap: "wrap", gap: 10 }}>
        {p.environments.map((e) => (
          <span key={e.name} style={{ display: "inline-flex", alignItems: "center", gap: 5 }} title={`${e.name}: ${e.status.replace("_", " ")}`}>
            <span className="dot" style={{ background: ENV_STATUS[e.status].dot }} />
            {e.name}
          </span>
        ))}
      </span>
      <span style={{ width: 130 }}>{status}</span>
      <span className="bm v" style={{ width: 100 }}>{p.lastDeploy ? `${p.lastDeploy.env} · ${timeAgo(p.lastDeploy.at)}` : "Not deployed"}</span>
      <Link className="ib" href={projectHref(p.id, "settings")} aria-label={`Settings for ${p.name}`}>
        <Icon name="more_vert" />
      </Link>
    </div>
  );
}

const STARTERS = [
  { href: "/projects/new", icon: "add_link", title: "Import a GitHub repo", body: "Every push deploys to your cluster" },
  { href: "https://github.com", icon: "terminal", title: "Install the hvn plugin", body: "Let Claude Code deploy and promote for you" },
  { href: "https://github.com", icon: "language", title: "Connect a domain", body: "Point DNS at your cluster’s gateway IP" },
  { href: "https://github.com", icon: "layers", title: "Shape your pipeline", body: "Environments and promotion gates in hvn.yaml" },
];

const DOCS = [
  { icon: "menu_book", title: "Docs", body: "How hvn builds, tests and promotes your app." },
  { icon: "description", title: "hvn.yaml reference", body: "Every key for environments and gates." },
  { icon: "smart_toy", title: "Plugin commands", body: "What your coding agent can do with hvn." },
];

function GetStarted() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      <section style={{ flex: "2 1 520px", minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 className="tm">Get started</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
          {STARTERS.map((s) => (
            <Link key={s.title} className="card-o sl" href={s.href} style={{ display: "flex", gap: 16, padding: 16, color: "var(--on-surf)" }}>
              <span className="av" style={{ background: "var(--sec-c)", color: "var(--on-sec-c)" }}><Icon name={s.icon} /></span>
              <span className="li-t"><span className="tm">{s.title}</span><span className="bm v">{s.body}</span></span>
            </Link>
          ))}
        </div>
      </section>
      <section style={{ flex: "1 1 300px", minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 className="tm">Learn more</h2>
        <div className="card-f" style={{ padding: 8, display: "flex", flexDirection: "column" }}>
          {DOCS.map((d) => (
            <a key={d.title} className="sl" href="https://github.com" target="_blank" rel="noreferrer" style={{ display: "flex", gap: 16, padding: 12, borderRadius: 12, color: "var(--on-surf)" }}>
              <Icon name={d.icon} style={{ color: "var(--pri)" }} />
              <span className="li-t"><span className="ts" style={{ color: "var(--pri)" }}>{d.title}</span><span className="bm v">{d.body}</span></span>
              <Icon name="open_in_new" size={18} className="v" />
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
