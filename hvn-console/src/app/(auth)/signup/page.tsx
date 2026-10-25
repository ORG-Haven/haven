import type { Metadata } from "next";
import { SignUpView } from "@/features/auth/SignUpView";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
  return <SignUpView />;
}
