import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoader } from "@/components/ui";
import { DeploymentsView } from "@/features/project/DeploymentsView";

export const metadata: Metadata = { title: "Deployments" };

export default function DeploymentsPage({ params }: PageProps<"/projects/[projectId]/deployments">) {
  return (
    <Suspense fallback={<PageLoader />}>
      {params.then(({ projectId }) => <DeploymentsView projectId={projectId} />)}
    </Suspense>
  );
}
