---
name: Cloud Sync Design
description: How AviStream syncs user data (watch history, bookmarks, search history) between localStorage and the API server.
---

## Pattern: write-through + custom event

- **Write path**: mutate localStorage immediately (instant UI), then fire-and-forget POST/PUT to `/api/user/*`.
- **Read/merge path**: on sign-in, `UserDataProvider` fetches cloud data, merges into localStorage (cloud wins by `savedAt`), then dispatches `SYNC_EVENT` (`"avistream:data-synced"`).
- **Cross-hook reactivity**: `useWatchProgress` and `useBookmarks` each listen for `SYNC_EVENT` and re-read from localStorage. This avoids threading context state through every consumer.
- **Clear operations**: `clearWatchHistory`, `clearBookmarks`, `removeWatchEntry` all dispatch `SYNC_EVENT` after writing localStorage so open hook consumers update immediately.

**Why:** Hooks were initialized once with `useState(load)` and would not see localStorage changes made by the provider without an explicit signal.

**How to apply:** Any future mutation that changes localStorage outside a hook's own callbacks must dispatch `window.dispatchEvent(new CustomEvent(SYNC_EVENT))` afterward. Import `SYNC_EVENT` from `use-watch-progress.ts`.
