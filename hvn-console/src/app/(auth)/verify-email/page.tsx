import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoader } from "@/components/ui";
import { VerifyEmailView } from "@/features/auth/VerifyEmailView";

export const metadata: Metadata = { title: "Verify your email" };

export default function VerifyEmailPage() {
  // The email comes from the query string, which is only known at request time.
  return (
    <Suspense fallback={<PageLoader />}>
      <VerifyEmailView />
    </Suspense>
  );
}
