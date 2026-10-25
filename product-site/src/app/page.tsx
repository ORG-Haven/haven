import type { CSSProperties } from "react";
import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { HeroIllustration } from "@/components/HeroIllustration";
import { ShipLoop } from "@/components/ShipLoop";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Icon } from "@/components/ui";
import { SIGN_UP_URL } from "@/lib/links";

const CLUSTERS = [
  { icon: "cloud", label: "Amazon EKS" },
  { icon: "cloud", label: "Google GKE" },
  { icon: "cloud", label: "Azure AKS" },
  { icon: "cloud", label: "DigitalOcean" },
  { icon: "dns", label: "k3s on your own servers" },
];

const FEATURES = [
  { icon: "layers", title: "Environments", body: "dev, staging, prod — or whatever you need. Each gets its own URL and its own health." },
  { icon: "front_hand", title: "Promotion gates", body: "Auto-promote what passes, hold what matters. Accept or reject from the console or your agent." },
  { icon: "language", title: "Domains and TLS", body: "Bring your domain, add the DNS records Haven shows you, and certificates renew on their own." },
  { icon: "history", title: "Redeploys and rollbacks", body: "Every deployment is kept. Roll any environment back to a known-good version in one step." },
  { icon: "monitor_heart", title: "Observability in plain words", body: "Errors and slowdowns explained without dashboards to decode — plus a fix prompt to hand your agent." },
  { icon: "smart_toy", title: "Agent access", body: "Grant a coding agent rights to deploy, promote and read telemetry per project. Revoke any time." },
];

type Cell = "yes" | string;
const COMPARISON: { row: string; paas: Cell; k8s: Cell; haven: Cell }[] = [
  { row: "Runs in a cloud account you own", paas: "No", k8s: "yes", haven: "yes" },
  { row: "No Kubernetes knowledge needed", paas: "yes", k8s: "No", haven: "yes" },
  { row: "Push-to-deploy from GitHub", paas: "yes", k8s: "Build it yourself", haven: "yes" },
  { row: "Promotion gates between environments", paas: "Varies", k8s: "Build it yourself", haven: "yes" },
  { row: "Coding agent can deploy and promote", paas: "Varies", k8s: "No", haven: "yes" },
  { row: "Compute billed by your provider, at cost", paas: "Marked up", k8s: "yes", haven: "yes" },
];

const LEARN = [
  { href: "/docs/quickstart", icon: "rocket_launch", title: "Quickstart", body: "Your first deploy in about ten minutes." },
  { href: "/docs/quickstart#install", icon: "dns", title: "Install on your cluster", body: "One Helm chart on the cluster you already run." },
  { href: "/docs/quickstart#project", icon: "description", title: "hvn.yaml", body: "Environments and gates, in one small file." },
  { href: "/docs/quickstart#install", icon: "smart_toy", title: "The hvn plugin", body: "What your coding agent can do with hvn." },
];

function CompareCell({ value }: { value: Cell }) {
  return value === "yes"
    ? <span className="tag t-ok"><Icon name="check" />Yes</span>
    : <span className="tag t-n">{value}</span>;
}

export default function Home() {
  return (
    <>
      <SiteHeader current="home" />
      <main>
        <section className="wrap hero">
          <div className="hero-copy">
            <a href="#agents" className="chip">
              <Icon name="terminal" />New: the hvn plugin for Claude Code<Icon name="arrow_forward" className="v" style={{ margin: "0 -6px 0 0" }} />
            </a>
            <h1 className="display">Deploy to a cluster <span style={{ color: "var(--pri)" }}>you own.</span></h1>
            <p className="lead-l">
              Connect a GitHub repo, let your coding agent manage hvn.yaml, and promote releases from dev to prod. No
              Kubernetes knowledge needed.
            </p>
            <div className="btn-row">
              <a className="btn filled lg" href={SIGN_UP_URL}><Icon name="rocket_launch" />Start deploying</a>
              <Link className="btn outlined lg" href="/docs/quickstart"><Icon name="menu_book" />Read the quickstart</Link>
            </div>
            <div className="checks">
              <span><Icon name="check_circle" />Free to start</span>
              <span><Icon name="check_circle" />Runs on your own cloud account</span>
              <span><Icon name="check_circle" />No YAML you have to write</span>
            </div>
          </div>
          <div className="hero-art">
            <HeroIllustration />
          </div>
        </section>

        <section className="band">
          <div className="wrap strip">
            <span className="v ts" style={{ fontWeight: 500 }}>Install Haven on any Kubernetes cluster you already pay for</span>
            <div className="btn-row" style={{ gap: 8 }}>
              {CLUSTERS.map((c) => <span key={c.label} className="chip"><Icon name={c.icon} />{c.label}</span>)}
            </div>
          </div>
        </section>

        <section id="product" className="wrap sec" style={{ paddingBottom: 56 }}>
          <div className="sec-h">
            <span className="eyebrow">How it works</span>
            <h2 className="hs">From push to prod in three steps.</h2>
            <p className="lead">Haven reads your repo, builds it, and carries each release through the environments you choose. You only step in where you asked to.</p>
          </div>
          <div className="grid" style={{ "--min": "300px", gap: 24 } as CSSProperties}>
            <div className="card-o card-pad">
              <span className="step">1</span>
              <h3 className="tl">Connect a GitHub repo</h3>
              <p className="bl v">Pick a repo and branch. Haven detects the framework and adds a default hvn.yaml if there isn’t one.</p>
              <div className="card-f mini">
                <Icon name="code" className="v" />
                <div className="stack" style={{ flex: 1 }}><span style={{ fontWeight: 500 }}>acme/storefront</span><span className="v" style={{ fontSize: 12 }}>Next.js · updated 2h ago</span></div>
                <span className="tag t-ok"><Icon name="check" />Ready</span>
              </div>
            </div>
            <div className="card-o card-pad">
              <span className="step">2</span>
              <h3 className="tl">Shape your pipeline</h3>
              <p className="bl v">Environments and promotion gates live in hvn.yaml. Ask your coding agent to change them, or edit by hand.</p>
              <pre className="code" style={{ marginTop: "auto", padding: "12px 16px" }}>
                <span className="k">environments</span>:{"\n"}
                {"  "}- <span className="k">name</span>: <span className="s">dev</span>{"\n"}
                {"  "}- <span className="k">name</span>: <span className="s">staging</span>{"\n"}
                {"    "}<span className="k">promote</span>: <span className="s">auto</span>{"\n"}
                {"  "}- <span className="k">name</span>: <span className="s">prod</span>{"\n"}
                {"    "}<span className="k">promote</span>: <span className="s">manual</span>
              </pre>
            </div>
            <div className="card-o card-pad">
              <span className="step">3</span>
              <h3 className="tl">Promote with one click</h3>
              <p className="bl v">Every push lands in dev. Releases move forward on their own, or wait at a gate until you accept them.</p>
              <div className="card-f mini">
                <span className="node t-ok"><Icon name="rocket_launch" /></span>
                <div className="stack" style={{ flex: 1 }}><span style={{ fontWeight: 500 }}>v1.4.2 promoted to prod</span><span className="v" style={{ fontSize: 12 }}>storefront.dev · TLS active</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="wrap sec" style={{ paddingTop: 56 }}>
          <div className="sec-hr">
            <div className="sec-h" style={{ maxWidth: 640 }}>
              <span className="eyebrow">Everything a release needs</span>
              <h2 className="hs">A platform team’s worth of tooling, without the platform team.</h2>
            </div>
            <Link className="btn outlined" href="/docs/quickstart">Explore the docs<Icon name="arrow_forward" className="end" /></Link>
          </div>
          <div className="grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="card-f stack" style={{ padding: 24, gap: 12 }}>
                <span className="feat-ic"><Icon name={f.icon} /></span>
                <h3 className="tm">{f.title}</h3>
                <p className="v" style={{ margin: 0 }}>{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="agents" className="band">
          <div className="wrap agents">
            <div>
              <span className="tag t-p" style={{ alignSelf: "flex-start" }}><Icon name="terminal" />hvn plugin</span>
              <h2 className="hs">Let your coding agent drive.</h2>
              <p className="lead">Install the hvn plugin in Claude Code and it can create projects, edit environments, read what’s failing and promote releases for you. You keep the final say on every gate.</p>
              <ul className="ticks">
                <li><Icon name="edit_note" />Edits hvn.yaml when you ask for a new environment</li>
                <li><Icon name="bug_report" />Reads production errors and proposes the fix</li>
                <li><Icon name="verified_user" />Scoped per project, revocable from Settings</li>
              </ul>
              <div className="code code-line"><span className="c">$</span><span>claude plugin install hvn</span><CopyButton text="claude plugin install hvn" small /></div>
            </div>
            <div>
              <div className="code">
                <div className="term-bar"><i /><i /><i /><span className="v" style={{ marginLeft: 8, fontSize: 12 }}>~/acme/storefront</span></div>
                <pre style={{ padding: 20 }}>
                  <span className="c">›</span> checkout is throwing on prod, can you look?{"\n\n"}
                  <span className="k">⏺ hvn</span> issues storefront --env prod{"\n"}
                  {"  "}<span className="w">!</span> TypeError in /api/checkout — 41 times in 10 min{"\n"}
                  {"    "}cart.items is undefined when the session expires{"\n\n"}
                  <span className="k">⏺</span> I’ve added a guard in app/api/checkout/route.ts{"\n"}
                  {"  "}and pushed fix/checkout-session.{"\n\n"}
                  <span className="k">⏺ hvn</span> deploy storefront --env staging{"\n"}
                  {"  "}<span className="s">✓</span> staging is healthy · error rate back to 0{"\n\n"}
                  {"  "}Ready for prod. Accept it in the console when{"\n"}
                  {"  "}you’re happy — prod has a manual gate.
                </pre>
              </div>
            </div>
          </div>
        </section>

        <section className="wrap sec" style={{ gap: 40 }}>
          <div className="sec-h">
            <span className="eyebrow">Why Haven</span>
            <h2 className="hs">The ease of a PaaS. The ownership of your own cluster.</h2>
          </div>
          <div className="card-o scroll">
            <table className="cmp">
              <thead>
                <tr><th scope="col" style={{ width: "40%" }}><span className="sr">Capability</span></th><th scope="col">Hosted PaaS</th><th scope="col">Kubernetes by hand</th><th scope="col" className="us">Haven</th></tr>
              </thead>
              <tbody>
                {COMPARISON.map((r) => (
                  <tr key={r.row}>
                    <td>{r.row}</td>
                    <td><CompareCell value={r.paas} /></td>
                    <td><CompareCell value={r.k8s} /></td>
                    <td><CompareCell value={r.haven} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="band">
          <div className="wrap sec" style={{ gap: 40, paddingTop: 104, paddingBottom: 104 }}>
            <div className="sec-hr">
              <div className="sec-h" style={{ maxWidth: 640 }}>
                <span className="eyebrow">Pricing</span>
                <h2 className="hs">Pay for Haven, not for compute.</h2>
                <p className="lead">Your servers stay on your own cloud bill. Haven is a simple plan on top.</p>
              </div>
              <Link className="btn outlined" href="/pricing">Compare plans<Icon name="arrow_forward" className="end" /></Link>
            </div>
            <div className="grid" style={{ "--min": "280px" } as CSSProperties}>
              <div className="card-o price-mini"><span className="tm">Hobby</span><span className="price-amt">Free</span><span className="v">One cluster for personal projects.</span><a className="btn tonal" href={SIGN_UP_URL}>Start free</a></div>
              <div className="card-o price-mini hl-border"><span className="tm" style={{ display: "flex", justifyContent: "space-between" }}>Team<span className="tag t-p">Most teams</span></span><span className="price-amt">[PRICE]<span className="v" style={{ fontSize: 16 }}> / seat / month</span></span><span className="v">Gates, agent access and shared projects.</span><a className="btn filled" href={SIGN_UP_URL}>Start a trial</a></div>
              <div className="card-o price-mini"><span className="tm">Enterprise</span><span className="price-amt">Custom</span><span className="v">SSO, audit log and a support SLA.</span><Link className="btn outlined" href="/pricing">Talk to us</Link></div>
            </div>
          </div>
        </section>

        <section className="wrap sec" style={{ gap: 40 }}>
          <div className="sec-h">
            <span className="eyebrow">Learn</span>
            <h2 className="hs">Docs that get you shipping.</h2>
          </div>
          <div className="grid" style={{ "--min": "240px" } as CSSProperties}>
            {LEARN.map((l) => (
              <Link key={l.title} href={l.href} className="card-o stack" style={{ padding: 24, gap: 10 }}>
                <Icon name={l.icon} style={{ color: "var(--pri)" }} />
                <span className="tm">{l.title}</span>
                <span className="v">{l.body}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="wrap" style={{ paddingBottom: 112 }}>
          <div className="cta">
            <div className="cta-copy">
              <h2 className="hs">Every push sets sail.</h2>
              <p>Haven carries each release from dev to prod, and brings it home safely to your own cluster.</p>
              <div className="btn-row" style={{ marginTop: 8 }}>
                <a className="btn lg on-c" href={SIGN_UP_URL}>Get started free</a>
                <Link className="btn lg ghost" href="/pricing">See pricing</Link>
              </div>
            </div>
            <div className="cta-art"><ShipLoop /></div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
