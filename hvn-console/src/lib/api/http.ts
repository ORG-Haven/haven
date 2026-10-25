import { ApiError } from "./errors";

/**
 * Calls hvnBFF through the console’s /api path (see proxy.ts).
 * Error replies carry {"message"}, which is shown to the user as is.
 */
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  } catch {
    throw new ApiError(0, "You appear to be offline. Check your connection and try again.");
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body?.message ?? "Something went wrong", body?.code);
  return body as T;
}
