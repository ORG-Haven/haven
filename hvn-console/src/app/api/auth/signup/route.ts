// Forwards sign-up to hvnBFF from the server, so the browser never calls the BFF directly
// (no CORS) and HVN_BFF_URL is read at runtime rather than baked into the bundle.
const BFF_URL = process.env.HVN_BFF_URL ?? "http://localhost:8081";

export async function POST(request: Request) {
  let res: Response;
  try {
    res = await fetch(`${BFF_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return Response.json({ message: "We couldn’t reach Haven. Try again in a moment." }, { status: 502 });
  }
  return new Response(res.body, { status: res.status, headers: { "Content-Type": "application/json" } });
}
