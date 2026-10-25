import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoader } from "@/components/ui";
import { SettingsView } from "@/features/project/SettingsView";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage({ params }: PageProps<"/projects/[projectId]/settings">) {
  return (
    <Suspense fallback={<PageLoader />}>
      {params.then(({ projectId }) => <SettingsView projectId={projectId} />)}
    </Suspense>
  );
}
