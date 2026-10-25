"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionButton, ErrorState, Icon, Page, PageHeader, PageLoader } from "@/components/ui";
import { projectHref } from "@/components/shell/routes";
import { errorMessage, timeAgo } from "@/lib/format";
import { useCreateProject, useRepos } from "@/lib/queries";

const DEFAULT_ENVS = ["dev", "qa", "uat", "staging", "prod"];
const DOMAIN_RE = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/;

export function NewProjectView() {
  const router = useRouter();
  const repos = useRepos();
  const create = useCreateProject();
  const [picked, setPicked] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [domain, setDomain] = useState("");
  const [rootDir, setRootDir] = useState("./");

  if (repos.isPending) return <PageLoader />;
  if (repos.isError) return <ErrorState message={errorMessage(repos.error)} onRetry={() => repos.refetch()} />;

  const available = repos.data.filter((r) => !r.onHaven);
  const selected = repos.data.find((r) => r.fullName === picked) ?? available[0];
  const shown = repos.data.filter((r) => r.name.includes(filter.trim().toLowerCase()));
  const domainOk = DOMAIN_RE.test(domain.trim().toLowerCase());

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !domainOk) return;
    create.mutate(
      { repo: selected.fullName, name: selected.name, domain: domain.trim().toLowerCase(), rootDir },
      { onSuccess: (p) => router.push(projectHref(p.id)) },
    );
  };

  return (
    <Page>
      <PageHeader
        title="Create a project"
        subtitle="Pick a repo, choose your domain, and every push deploys to your cluster."
        actions={<Link className="btn outlined" href="/projects">Cancel</Link>}
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 48, alignItems: "flex-start" }}>
        <section style={{ flex: "1 1 420px", minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}><span className="step">1</span><h2 className="tl">Import a Git repository</h2></div>
            <span className="chip"><Icon name="account_circle" />senith-uthsara</span>
          </div>
          <label className="search" style={{ flex: "none", height: 48, borderRadius: 24 }}>
            <Icon name="search" />
            <span className="sr">Search repositories</span>
            <input type="search" placeholder="Search your repositories" value={filter} onChange={(e) => setFilter(e.target.value)} />
          </label>
          <div className="list">
            {shown.map((r) => {
              const isSel = r.fullName === selected?.fullName;
              return (
                <div key={r.fullName} className="li" style={{ background: isSel ? "color-mix(in srgb, var(--pri) 8%, transparent)" : undefined }}>
                  <span className="av" style={{ background: "var(--sec-c)", color: "var(--on-sec-c)" }}><Icon name="code" /></span>
                  <span className="li-t">
                    <span className="bl mono">{r.name}</span>
                    <span className="bm v">{r.framework} · {r.onHaven ? "already on Haven" : `updated ${timeAgo(r.updatedAt)}`}</span>
                  </span>
                  {r.onHaven ? (
                    <span className="tag t-n">On Haven</span>
                  ) : (
                    <button type="button" className={`btn ${isSel ? "filled" : "tonal"}`} aria-pressed={isSel} onClick={() => setPicked(r.fullName)}>
                      <Icon name={isSel ? "check" : "download"} />
                      {isSel ? "Selected" : "Import"}
                    </button>
                  )}
                </div>
              );
            })}
            {shown.length === 0 && <div className="li bm v">No repositories match “{filter}”.</div>}
          </div>
          <span className="bm v">Missing a repo? <a href="https://github.com/settings/installations">Adjust GitHub app permissions</a></span>
        </section>

        <form onSubmit={submit} style={{ flex: "1 1 420px", minWidth: 0, display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="step">2</span>
            <h2 className="tl">Configure {selected ? <span className="mono">{selected.name}</span> : "your project"}</h2>
          </div>
          <label className="tf">
            <span className="tf-l">Project name</span>
            <input type="text" value={selected?.name ?? ""} readOnly />
          </label>
          <div>
            <label className="tf">
              <span className="tf-l">Domain</span>
              <input
                className="mono"
                type="text"
                placeholder="yourapp.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                aria-invalid={domain !== "" && !domainOk}
                aria-describedby="domain-help"
                required
              />
            </label>
            <span id="domain-help" className={`tf-s${domain !== "" && !domainOk ? " err-text" : ""}`}>
              {domain !== "" && !domainOk ? "Enter a domain like yourapp.com" : "Every environment gets a hostname under this domain. You set it once, here."}
            </span>
          </div>
          <label className="tf">
            <span className="tf-l">Root directory</span>
            <input className="mono" type="text" value={rootDir} onChange={(e) => setRootDir(e.target.value)} />
          </label>

          <div className="card-f" style={{ padding: 16, display: "flex", gap: 16 }}>
            <Icon name="check_circle" fill style={{ color: "var(--ok)" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
              <span className="ts">No hvn.yaml found — we’ll add the default one</span>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                {DEFAULT_ENVS.map((e, i) => (
                  <span key={e} style={{ display: "contents" }}>
                    <span className="chip mono" style={{ minHeight: 28, padding: "2px 12px" }}>{e}</span>
                    {i < DEFAULT_ENVS.length - 1 && <Icon name="arrow_forward" size={16} className="v" />}
                  </span>
                ))}
              </div>
              <span className="bm v">Want fewer or different environments? Ask your coding agent — the hvn plugin edits hvn.yaml for you.</span>
            </div>
          </div>

          {create.isError && <span className="bm err-text" role="alert">{errorMessage(create.error)}</span>}
          <div>
            <ActionButton type="submit" variant="filled" icon="rocket_launch" pending={create.isPending} disabled={!selected || !domainOk} style={{ height: 48, padding: "0 28px" }}>
              Create project &amp; deploy to dev
            </ActionButton>
          </div>
        </form>
      </div>
    </Page>
  );
}
