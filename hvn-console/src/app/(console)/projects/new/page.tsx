import type { Metadata } from "next";
import { NewProjectView } from "@/features/projects/NewProjectView";

export const metadata: Metadata = { title: "Create a project" };

export default function NewProjectPage() {
  return <NewProjectView />;
}
