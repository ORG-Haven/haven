import type { Metadata } from "next";
import { ForgotPasswordView } from "@/features/auth/ForgotPasswordView";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return <ForgotPasswordView />;
}
