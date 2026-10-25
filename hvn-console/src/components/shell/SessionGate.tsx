"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ErrorState, PageLoader } from "@/components/ui";
import { errorMessage } from "@/lib/format";
import { useSession } from "@/lib/queries";

/**
 * Sends the user to sign in when the BFF says the session is gone: a cookie that expired or
 * was signed out elsewhere. proxy.ts has already turned away visitors without a cookie.
 *
 * The page renders while the session check is in flight rather than waiting for it, so
 * navigations stay instant (and Next's instant-navigation validation can see the page).
 * That's safe: the page shows nothing the BFF would refuse, since every data endpoint
 * checks the session itself.
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
  if (signedOut) return <PageLoader label="Signing you out…" />;
  return children;
}
