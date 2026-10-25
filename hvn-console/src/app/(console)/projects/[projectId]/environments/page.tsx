import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoader } from "@/components/ui";
import { EnvironmentsView } from "@/features/project/EnvironmentsView";

export const metadata: Metadata = { title: "Environments" };

export default function EnvironmentsPage({ params }: PageProps<"/projects/[projectId]/environments">) {
  return (
    <Suspense fallback={<PageLoader />}>
      {params.then(({ projectId }) => <EnvironmentsView projectId={projectId} />)}
    </Suspense>
  );
}
