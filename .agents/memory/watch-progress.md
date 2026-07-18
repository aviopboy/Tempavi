---
name: AviStream Watch Progress Tracker
description: localStorage-based progress tracking; key decisions about effect deps and accumulation.
---

## Implementation
- Hook: `artifacts/anime-site/src/hooks/use-watch-progress.ts`
- Storage key: `avistream_progress` → `{ [episodeId]: ProgressEntry }`
- Constants: `DEFAULT_DURATION=1440`, `WATCHED_THRESHOLD=0.85`

## Key decisions
- **Wall-clock elapsed time** — `setInterval` every 1s, accumulates only when `!document.hidden`.
- **seriesInfo in effect deps** — tracker effect must include `seriesInfo` in deps array; if playerUrl resolves before seriesInfo loads, the effect early-returns and won't rerun without seriesInfo in deps.
- **Save cadence** — every 10s of accumulated elapsed time + final save on unmount.
- **Watched threshold** — 85% elapsed triggers `markWatched`.

**Why:** Without seriesInfo in deps, a race between playerUrl and series data fetch leaves progress tracking silently disabled for the session.
