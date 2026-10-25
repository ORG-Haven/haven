"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ErrorState, PageLoader } from "@/components/ui";
import { errorMessage } from "@/lib/format";
import { useSession } from "@/lib/queries";

/**
 * Renders the page only once the BFF confirms the session. proxy.ts has already turned away
 * visitors without a cookie; this catches cookies that expired or were signed out elsewhere.
 */
export function SessionGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const session = useSession();
  const signedOut = session.isSuccess && !session.data;

  useEffect(() => {
    if (!signedOut) return;
    const next = window.location.pathname + window.location.search;
    router.replace(`/signin?next=${encodeURIComponent(next)}`);
  }, [signedOut, router]);

  if (session.isError) {
    return <ErrorState title="Couldn’t check your sign-in" message={errorMessage(session.error)} onRetry={() => session.refetch()} />;
  }
  if (!session.data) return <PageLoader />;
  return children;
}
