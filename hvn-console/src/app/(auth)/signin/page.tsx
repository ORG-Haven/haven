import type { Metadata } from "next";
import { SignInView } from "@/features/auth/SignInView";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return <SignInView />;
}
