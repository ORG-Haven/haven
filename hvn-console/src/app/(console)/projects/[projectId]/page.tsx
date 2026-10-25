import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoader } from "@/components/ui";
import { OverviewView } from "@/features/project/OverviewView";

export const metadata: Metadata = { title: "Overview" };

export default function OverviewPage({ params }: PageProps<"/projects/[projectId]">) {
  return (
    <Suspense fallback={<PageLoader />}>
      {params.then(({ projectId }) => <OverviewView projectId={projectId} />)}
    </Suspense>
  );
}
