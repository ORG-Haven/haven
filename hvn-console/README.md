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

## Backend: mostly mocked

Sign-up is real: `SignUpView` → `api.signUp` → `POST /api/auth/signup` (a route handler in
`src/app/api/auth/signup/route.ts`) → hvnBFF `POST /auth/signup`, which stores the user in Postgres.
The route handler runs on the server and reads `HVN_BFF_URL` at runtime (default
`http://localhost:8081`, the port docker compose publishes the BFF on), so the browser never calls
the BFF directly.

Everything else still comes from `mockApi` in `src/lib/api/mock/`, an in-memory implementation of
`HavenApi` with simulated latency. `src/lib/api/client.ts` spreads the mock and overrides the
methods that have a BFF endpoint; move each one over the same way as its endpoint lands. Mutations
in the mock (accept/reject a promotion, redeploy, roll back, edit a hostname, change the domain,
revoke an agent, create/delete a project) really change the mock data until the page is reloaded.

Sign-in is still mocked, so accounts created through sign-up can’t sign in yet. Use
`demo@haven.dev` / `haven1234`. "Continue with Google/GitHub" signs straight in instead of
redirecting to the provider. Pages are not protected yet: the console opens without a session.

## Notes

- Dark theme is the default; the choice is saved in `localStorage` (`haven-theme`) and applied
  before first paint to avoid a flash.
- The animated Harbor loader shows in the content area while a page's data loads; the drawer
  and top bar stay put.
- Cache Components is enabled, so pages that read route params do so inside a `Suspense`
  boundary (see any `src/app/(console)/projects/[projectId]/**/page.tsx`).
- React Query Devtools are available in development (bottom-left).
