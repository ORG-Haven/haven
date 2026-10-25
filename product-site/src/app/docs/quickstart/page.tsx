import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { SiteHeader } from "@/components/SiteHeader";
import { Icon } from "@/components/ui";
import { InstallTabs } from "./InstallTabs";

export const metadata: Metadata = {
  title: "Quickstart",
  description: "Deploy your first app to a cluster you own in about ten minutes.",
};

// Only the quickstart exists so far; the other entries are the planned docs tree.
const NAV: { title: string; items: { label: string; href?: string }[] }[] = [
  { title: "Get started", items: [{ label: "Introduction" }, { label: "Quickstart", href: "/docs/quickstart" }, { label: "Install on your cluster" }, { label: "Connect GitHub" }] },
  { title: "Concepts", items: [{ label: "Projects" }, { label: "Environments" }, { label: "Promotion gates" }, { label: "Domains and TLS" }, { label: "Deployments and rollbacks" }] },
  { title: "Agents", items: [{ label: "The hvn plugin" }, { label: "Agent access" }, { label: "Fix prompts" }] },
  { title: "Reference", items: [{ label: "hvn.yaml" }, { label: "Plugin commands" }, { label: "Helm values" }] },
];

const TOC = [
  { id: "install", label: "Install Haven on your cluster" },
  { id: "project", label: "Create a project" },
  { id: "push", label: "Push and watch it deploy" },
  { id: "promote", label: "Promote to prod" },
  { id: "domain", label: "Add your domain" },
];

const HVN_YAML = `name: storefront
environments:
  - name: dev
    branch: main
  - name: staging
    promote: auto     # moves on when dev is healthy
  - name: prod
    promote: manual   # waits for you to accept`;

const ROLLOUT = [
  { env: "dev", tone: "t-ok", icon: "check", label: "Succeeded" },
  { env: "staging", tone: "t-ok", icon: "check", label: "Succeeded" },
  { env: "prod", tone: "t-warn", icon: "hourglass_top", label: "Awaiting acceptance" },
];

export default function QuickstartPage() {
  return (
    <>
      <SiteHeader current="docs" />
      <div className="docs">
        <aside className="side" aria-label="Docs">
          {NAV.map((g) => (
            <div key={g.title}>
              <div className="side-h">{g.title}</div>
              {g.items.map((i) => (
                <Link key={i.label} href={i.href ?? "#"} aria-current={i.href === "/docs/quickstart" ? "page" : undefined}>{i.label}</Link>
              ))}
            </div>
          ))}
        </aside>

        <main className="doc">
          <nav aria-label="Breadcrumb" className="crumbs">
            <Link href="/docs/quickstart">Docs</Link><Icon name="chevron_right" />
            <span>Get started</span><Icon name="chevron_right" />
            <span style={{ color: "var(--on-surf)" }}>Quickstart</span>
          </nav>
          <h1>Quickstart</h1>
          <p className="lead-l">Deploy your first app to a cluster you own in about ten minutes. You won’t write any Kubernetes config.</p>
          <div className="btn-row" style={{ gap: 8 }}>
            <span className="tag t-n"><Icon name="schedule" />10 min</span>
            <span className="tag t-n"><Icon name="school" />Beginner</span>
          </div>

          <div className="card-f callout">
            <Icon name="checklist" style={{ color: "var(--pri)" }} />
            <div className="stack" style={{ gap: 8 }}>
              <span className="tm">Before you start</span>
              <ul>
                <li>A GitHub account with a repo you want to deploy</li>
                <li>A Kubernetes cluster you can reach with <code className="i">kubectl</code> — any provider works</li>
                <li>Claude Code, if you want your agent to drive (optional)</li>
              </ul>
            </div>
          </div>

          <h2 id="install"><span className="step">1</span>Install Haven on your cluster</h2>
          <p>Haven runs inside your cluster as one Helm chart. It sets up the gateway, certificates and the agent that talks to the console.</p>
          <InstallTabs />
          <p className="v">When the install finishes, your cluster shows up in the console as <span className="tag t-ok"><Icon name="check" />Healthy</span>.</p>

          <h2 id="project"><span className="step">2</span>Create a project</h2>
          <p>In the console, choose <strong>New project</strong> and pick a repo. Haven detects the framework and adds a default <code className="i">hvn.yaml</code> if your repo doesn’t have one.</p>
          <div className="code">
            <div className="code-h"><span className="mono">hvn.yaml</span><CopyButton text={HVN_YAML} small /></div>
            <pre>
              {HVN_YAML.split("\n").map((line, i) => {
                const [code, comment] = line.split("#");
                const m = code.match(/^(\s*-?\s*)(\w+):(.*)$/);
                return (
                  <span key={i}>
                    {m ? <>{m[1]}<span className="k">{m[2]}</span>:<span className="s">{m[3]}</span></> : code}
                    {comment && <span className="c">#{comment}</span>}
                    {"\n"}
                  </span>
                );
              })}
            </pre>
          </div>
          <div className="tip">
            <Icon name="lightbulb" />
            <p>Want fewer or different environments? Ask your coding agent — the hvn plugin edits <code className="i">hvn.yaml</code> for you.</p>
          </div>

          <h2 id="push"><span className="step">3</span>Push and watch it deploy</h2>
          <p>Every push to <code className="i">main</code> builds and deploys to dev. Once dev is healthy, staging gets the same release automatically.</p>
          <div className="code">
            <div className="code-h"><span>Terminal</span><CopyButton text="git push origin main" small /></div>
            <pre>git push origin main</pre>
          </div>
          <div className="card-o status-list">
            {ROLLOUT.map((r) => (
              <div key={r.env}>
                <span className={`tag ${r.tone}`}><Icon name={r.icon} />{r.label}</span>
                <b>{r.env}</b>
                <span className="mono v">9f2c1ab</span>
              </div>
            ))}
          </div>

          <h2 id="promote"><span className="step">4</span>Promote to prod</h2>
          <p>Prod has a manual gate, so the release waits for you. Open the project in the console and choose <strong>Accept</strong>, or reject it with a note for your team.</p>

          <h2 id="domain"><span className="step">5</span>Add your domain</h2>
          <p>In <strong>Settings › Domain</strong>, enter your domain and add the A records Haven shows you at your DNS provider. Certificates are issued as soon as the records resolve.</p>

          <div className="grid pager" style={{ "--min": "240px", marginTop: 40 } as CSSProperties}>
            <Link href="#" className="card-o"><small><Icon name="arrow_back" />Previous</small><span className="tm">Introduction</span></Link>
            <Link href="#" className="card-o"><small>Next<Icon name="arrow_forward" /></small><span className="tm">Install on your cluster</span></Link>
          </div>
        </main>

        <aside className="toc-col" aria-label="On this page">
          <div className="stack" style={{ gap: 12 }}>
            <span className="v" style={{ font: "500 12px/16px var(--font-roboto), sans-serif", letterSpacing: ".5px" }}>On this page</span>
            <nav className="toc">
              {TOC.map((t) => <a key={t.id} href={`#${t.id}`}>{t.label}</a>)}
            </nav>
            <div className="card-f stack" style={{ marginTop: 16, padding: 16, gap: 8 }}>
              <Icon name="smart_toy" style={{ color: "var(--pri)" }} />
              <span style={{ fontWeight: 500 }}>Prefer your agent?</span>
              <span className="v">Install the hvn plugin and ask Claude Code to do these steps.</span>
              <Link href="#install" style={{ fontWeight: 500 }}>See the install step</Link>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
