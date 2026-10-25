# hvn-console

The Haven web console: a Next.js (App Router) app styled with Material 3 that lets people
manage projects, environments, deployments and promotions on their own cluster.

## Run it

```sh
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (also type-checks)
npm run lint
```

## How it is put together

| Path | What lives there |
| --- | --- |
| `src/app/(console)/` | Routes. Each `page.tsx` is a thin server component that hands the route params to a client view. |
| `src/app/(auth)/` | Sign in, sign up, forgot password and verify email. No drawer or top bar. |
| `src/features/` | One client view per screen (projects list, create project, overview, deployments, environments, observability, settings, and the auth screens in `features/auth/`). |
| `src/components/shell/` | Navigation drawer and top app bar, shared by every console page. |
| `src/components/ui.tsx` | Small M3 building blocks: icons, the Harbor logo and loader, tags, page states, snackbar. |
| `src/app/globals.css` | Material 3 color tokens (dark and light), type scale and components. |
| `src/lib/queries.ts` | React Query keys and hooks — the only way views read or change data. |
| `src/lib/api/client.ts` | `HavenApi`, the interface the hooks call. |
| `src/lib/api/mock/` | In-memory mock of the backend used today. |

## Backend: auth is real, the rest is mocked

Email and password auth goes through hvnBFF. `src/proxy.ts` forwards every `/api/*` request to
the BFF (`/api/auth/signin` → `POST /auth/signin`), reading `HVN_BFF_URL` at runtime (default
`http://localhost:8081`, the port docker compose publishes the BFF on). Because the browser only
ever talks to the console's origin, the BFF's session cookie is first-party.

The BFF owns the session: it sets the httpOnly cookie on sign-in and sign-up (valid 30 days),
clears it on sign-out or when it no longer matches a session, and rejects state-changing requests
from origins not in its `ALLOWED_ORIGINS`. The console never sees the token. The cookie is
`__Host-haven_session` in production and `haven_session` when the BFF runs with
`COOKIE_SECURE=false` for local HTTP.

Console pages are protected in two layers:

- `src/proxy.ts` redirects to `/signin?next=…` when there is no session cookie, and sends
  signed-in people from `/signin` and `/signup` to `/projects`. It only looks at the cookie.
- `SessionGate` (in the console layout) asks the BFF for the session before rendering a page, and
  sends the user to sign in if the cookie is expired or was signed out elsewhere.

Sign-up signs the new user straight in; there is no email verification yet. "Continue with
Google/GitHub" shows a "not available yet" message until OAuth exists in the BFF. Forgot password
and resend verification are still mocked and always succeed.

Everything else (projects, pipelines, deployments, environments, observability, agents) comes
from `mockApi` in `src/lib/api/mock/`, an in-memory implementation of `HavenApi` with simulated
latency. `src/lib/api/client.ts` spreads the mock and overrides the methods that have a BFF
endpoint; move each one over the same way as its endpoint lands. Mock data resets on reload.

## Notes

- Dark theme is the default; the choice is saved in `localStorage` (`haven-theme`) and applied
  before first paint to avoid a flash.
- The animated Harbor loader shows in the content area while a page's data loads; the drawer
  and top bar stay put.
- Cache Components is enabled, so pages that read route params do so inside a `Suspense`
  boundary (see any `src/app/(console)/projects/[projectId]/**/page.tsx`).
- React Query Devtools are available in development (bottom-left).
