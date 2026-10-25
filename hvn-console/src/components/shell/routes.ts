export const PROJECT_SECTIONS = [
  { slug: "", label: "Overview", icon: "space_dashboard" },
  { slug: "deployments", label: "Deployments", icon: "rocket_launch" },
  { slug: "environments", label: "Environments", icon: "layers" },
  { slug: "observability", label: "Observability", icon: "monitoring" },
  { slug: "settings", label: "Settings", icon: "settings" },
] as const;

export const projectHref = (projectId: string, slug = "") =>
  `/projects/${encodeURIComponent(projectId)}${slug ? `/${slug}` : ""}`;

/** Splits a console pathname into the project and section it points at. */
export function parseConsolePath(pathname: string | null) {
  const parts = (pathname ?? "").split("/").filter(Boolean);
  if (parts[0] !== "projects") return { page: "other" as const };
  if (parts.length === 1) return { page: "projects" as const };
  if (parts[1] === "new") return { page: "new" as const };
  return { page: "project" as const, projectId: decodeURIComponent(parts[1]), section: parts[2] ?? "" };
}
