"use client";

import type { ReactNode } from "react";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ApiError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/queries";

let browserQueryClient: QueryClient | undefined;

function makeQueryClient() {
  // Any 401 means the BFF no longer accepts the session (expired, or signed out elsewhere).
  // Forgetting the cached session makes SessionGate send the user to sign in.
  const onError = (err: unknown) => {
    if (err instanceof ApiError && err.status === 401 && client.getQueryData(queryKeys.session)) {
      client.setQueryData(queryKeys.session, null);
    }
  };
  const client = new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // A missing project will not appear by retrying.
        retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2,
      },
    },
  });
  return client;
}

function getQueryClient() {
  // Keep server requests isolated and preserve the browser cache across renders.
  if (typeof window === "undefined") return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={getQueryClient()}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </QueryClientProvider>
  );
}
