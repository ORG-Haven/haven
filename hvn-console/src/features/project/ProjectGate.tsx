"use client";

import type { ReactNode } from "react";
import { ErrorState, NotFoundState, PageLoader } from "@/components/ui";
import type { Project } from "@/lib/api/types";
import { isNotFound } from "@/lib/api/errors";
import { errorMessage } from "@/lib/format";
import { useProject } from "@/lib/queries";

/** Loads the project once for every project page and handles loading / missing / failed states. */
export function ProjectGate({ projectId, children }: { projectId: string; children: (project: Project) => ReactNode }) {
  const project = useProject(projectId);
  if (project.isPending) return <PageLoader />;
  if (project.isError) {
    return isNotFound(project.error)
      ? <NotFoundState what="Project" />
      : <ErrorState message={errorMessage(project.error)} onRetry={() => project.refetch()} />;
  }
  return <>{children(project.data)}</>;
}
