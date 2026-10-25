import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoader } from "@/components/ui";
import { ObservabilityView } from "@/features/project/ObservabilityView";

export const metadata: Metadata = { title: "Observability" };

export default function ObservabilityPage({ params }: PageProps<"/projects/[projectId]/observability">) {
  return (
    <Suspense fallback={<PageLoader />}>
      {params.then(({ projectId }) => <ObservabilityView projectId={projectId} />)}
    </Suspense>
  );
}
