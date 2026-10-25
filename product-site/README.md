# product-site

Haven's public marketing site: home, pricing and docs. A Next.js (App Router) app that shares the
console's Material 3 tokens, Roboto type, Harbor logo and theme handling, so the two feel like one product.

## Run it

```sh
npm install
npm run dev        # http://localhost:3001 (the console uses 3000)
npm run build      # production build (also type-checks)
npm run lint
```

## How it is put together

| Path | What lives there |
| --- | --- |
| `src/app/page.tsx` | Home: hero illustration, how it works, features, agents, comparison, pricing teaser, docs, closing CTA. |
| `src/app/pricing/` | Plans (with the monthly/yearly switch in `PricingPlans.tsx`), comparison table and FAQ. |
| `src/app/docs/quickstart/` | The Quickstart guide. `/docs` redirects here; the other sidebar entries are planned pages. |
| `src/components/HeroIllustration.tsx` | Animated hero: a release rides from dev to staging, waits at the manual gate, lands on prod. |
| `src/components/ShipLoop.tsx` | The sailing Harbor mark from the console's sign-in panel, reused in the closing CTA. |
| `src/components/SiteHeader.tsx`, `SiteFooter.tsx` | Shared header (with the theme toggle) and footer. |
| `src/app/globals.css` | Color tokens (copied from `hvn-console/src/app/globals.css` — keep them in sync) and page styles. |
| `src/lib/theme.ts`, `theme-boot.ts` | Dark/light theme, saved under the same `haven-theme` key as the console. |
| `src/lib/links.ts` | Where Sign in / Get started point. |

## Configuration

`NEXT_PUBLIC_CONSOLE_URL` sets the console that "Sign in" and "Get started" link to (default
`http://localhost:3000`). It is inlined at build time, so set it before `npm run build` or `docker build`.

## Placeholders to fill in

Search for `[` and `TODO` in `src/`: plan prices and limits, the Helm chart repo, the contact link,
and the Company/Legal footer pages.

## Notes

- Every page is static. Only the theme toggle, billing switch, install tabs and copy buttons are client components.
- Animations are SVG/CSS. With "reduce motion" on, the moving parts are hidden and a still scene is shown.
