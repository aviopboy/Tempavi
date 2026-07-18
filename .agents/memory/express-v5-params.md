---
name: Express v5 Params Typing
description: Express v5 types req.params values as string | string[], breaking Drizzle eq() calls.
---

## Rule

In Express v5, `req.params` values are typed `string | string[]` rather than `string`. Drizzle's `eq()` only accepts `string | SQLWrapper`, so destructuring `const { id } = req.params` and passing `id` to `eq()` causes `TS2769`.

**Fix:** Use `const id = String(req.params.id)` (or the relevant param name) to narrow to `string` before passing to Drizzle.

**Why:** The project uses `express@5.x`. This affects all route handlers that use params with Drizzle queries.

**How to apply:** Any time a new parameterized route (`/foo/:id`) is added that queries the DB, always do `const id = String(req.params.id)` — never destructure.
