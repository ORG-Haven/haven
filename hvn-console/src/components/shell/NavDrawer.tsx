"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HarborLogo, Icon } from "@/components/ui";
import { useAgents, useCluster, useObservability, useProject, useProjects } from "@/lib/queries";
import { PROJECT_SECTIONS, parseConsolePath, projectHref } from "./routes";

export function RoutedNavDrawer() {
  return <NavDrawer pathname={usePathname()} />;
}

/** `pathname` is null while the route is still resolving; nothing is marked active then. */
export function NavDrawer({ pathname }: { pathname: string | null }) {
  const route = parseConsolePath(pathname);
  const currentId = route.page === "project" ? route.projectId : undefined;
  const { data: projects } = useProjects();

  return (
    <aside className="drawer">
      <Link className="brand" href="/projects">
        <HarborLogo />
        haven
      </Link>
      <nav className="nd-list" aria-label="Main">
        <span className="nd-h">Projects</span>
        <Link className={`nd${route.page === "projects" ? " on" : ""}`} href="/projects" aria-current={route.page === "projects" ? "page" : undefined}>
          <Icon name="apps" />
          All projects
        </Link>

        {projects?.map((p) => {
          const open = p.id === currentId;
          return (
            <div key={p.id} style={{ display: "contents" }}>
              <Link className="nd" href={projectHref(p.id)} aria-expanded={open} style={open ? { color: "var(--on-surf)" } : undefined}>
                <Icon name={open ? "expand_more" : "chevron_right"} />
                <span className="sq" style={{ background: p.color }} />
                {p.name}
              </Link>
              {open && route.page === "project" &&
                PROJECT_SECTIONS.map((s) => {
                  const active = route.section === s.slug;
                  return (
                    <Link
                      key={s.slug}
                      className={`nd sub${active ? " on" : ""}`}
                      href={projectHref(p.id, s.slug)}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon name={s.icon} />
                      {s.label}
                      {s.slug === "observability" && <IssueBadge projectId={p.id} />}
                    </Link>
                  );
                })}
            </div>
          );
        })}

        <Link
          className={`nd${route.page === "new" ? " on" : ""}`}
          href="/projects/new"
          style={route.page === "new" ? undefined : { color: "var(--pri)" }}
          aria-current={route.page === "new" ? "page" : undefined}
        >
          <Icon name="add" />
          New project
        </Link>
      </nav>
      {currentId ? <AgentStatus projectId={currentId} /> : <ClusterStatus />}
    </aside>
  );
}

function IssueBadge({ projectId }: { projectId: string }) {
  // Only issues in the last environment (prod) surface in the nav; those are the ones users hit.
  const { data: project } = useProject(projectId);
  const { data: obs } = useObservability(projectId, project?.environments.at(-1)?.name ?? "");
  const count = obs?.issues.length ?? 0;
  return count > 0 ? <span className="badge" aria-label={`${count} open issues`}>{count}</span> : null;
}

function ClusterStatus() {
  const { data } = useCluster();
  if (!data) return null;
  return (
    <div className="drawer-foot card-f">
      <Icon name={data.healthy ? "cloud_done" : "cloud_off"} fill style={{ color: data.healthy ? "var(--ok)" : "var(--err)" }} />
      <span className="li-t">
        <span className="ts">{data.name}</span>
        <span className="bs v">
          {data.nodes} nodes · {data.healthy ? "healthy" : "needs attention"}
        </span>
      </span>
    </div>
  );
}

function AgentStatus({ projectId }: { projectId: string }) {
  const { data } = useAgents(projectId);
  if (!data) return null;
  const agent = data.find((a) => a.kind === "claude-code" && a.connected);
  return (
    <div className="drawer-foot card-f">
      <Icon name="smart_toy" fill style={{ color: agent ? "var(--ok)" : "var(--on-surf-v)" }} />
      <span className="li-t">
        <span className="ts">{agent ? "Claude Code connected" : "No agent connected"}</span>
        <span className="bs v">{agent ? "via hvn plugin" : "Install the hvn plugin"}</span>
      </span>
    </div>
  );
}
