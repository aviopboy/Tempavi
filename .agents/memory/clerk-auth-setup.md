---
name: Clerk Auth Setup — AviStream
description: Replit-managed Clerk provisioned for anime-site + api-server. Key wiring rules and Tailwind v4 gotchas.
---

## Setup state
- `setupClerkWhitelabelAuth()` called — secrets auto-provisioned: `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`.
- Proxy middleware copied to `artifacts/api-server/src/middlewares/clerkProxyMiddleware.ts`.
- Server deps: `@clerk/express`, `@clerk/shared`, `http-proxy-middleware`.
- Client deps: `@clerk/react`, `@clerk/themes`.

## Critical wiring rules (copy verbatim)
- `publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)` — not the raw env var.
- `proxyUrl = import.meta.env.VITE_CLERK_PROXY_URL` — unconditional, empty in dev.
- Route paths must be exactly `"/sign-in/*?"` and `"/sign-up/*?"` — the `/*?` wildcard is required.
- `<SignIn path={`${basePath}/sign-in`} routing="path">` — full window.location path, not base-relative.
- `stripBase()` helper strips basePath prefix before calling `setLocation` in routerPush/routerReplace.

## Tailwind v4 — Clerk layer
- Add `@layer theme, base, clerk, components, utilities;` **before** `@import 'tailwindcss'` in index.css.
- Pass `tailwindcss({ optimize: false })` to `@tailwindcss/vite` plugin — prevents nested @layer reordering in prod builds.
- `cssLayerName: "clerk"` in appearance object.

## CORS
- `api-server/src/app.ts` uses `ALLOWED_ORIGINS` env var (comma-separated) for production; falls back to `true` in dev.

**Why:** Replit-managed Clerk dev keys intentionally show a console warning — expected, not a bug.
