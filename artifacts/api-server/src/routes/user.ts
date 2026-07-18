import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import {
  watchHistoryTable,
  searchHistoryTable,
  bookmarksTable,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// ── Auth middleware ───────────────────────────────────────────────────────────
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as Request & { userId: string }).userId = userId;
  next();
}

function uid(req: Request): string {
  return (req as Request & { userId: string }).userId;
}

// ── Watch History ─────────────────────────────────────────────────────────────

router.get("/user/watch-history", requireAuth, async (req, res) => {
  try {
    const entries = await db
      .select()
      .from(watchHistoryTable)
      .where(eq(watchHistoryTable.userId, uid(req)))
      .orderBy(desc(watchHistoryTable.savedAt));
    res.json({ success: true, data: entries });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch watch history");
    res.status(500).json({ error: "Failed to fetch watch history" });
  }
});

router.post("/user/watch-history", requireAuth, async (req, res) => {
  const {
    episodeId, seriesSlug, seriesTitle, seriesImage,
    season, episodeNum, episodeTitle, position, duration, savedAt,
  } = req.body as Record<string, unknown>;

  if (!episodeId || !seriesSlug) {
    res.status(400).json({ error: "episodeId and seriesSlug are required" });
    return;
  }
  try {
    await db
      .insert(watchHistoryTable)
      .values({
        userId: uid(req),
        episodeId: episodeId as string,
        seriesSlug: seriesSlug as string,
        seriesTitle: (seriesTitle as string) ?? "",
        seriesImage: (seriesImage as string | null) ?? null,
        season: (season as string) ?? "",
        episodeNum: (episodeNum as string) ?? "",
        episodeTitle: (episodeTitle as string) ?? "",
        position: (position as number) ?? 0,
        duration: (duration as number) ?? 1440,
        savedAt: (savedAt as number) ?? Date.now(),
      })
      .onConflictDoUpdate({
        target: [watchHistoryTable.userId, watchHistoryTable.episodeId],
        set: {
          seriesSlug: seriesSlug as string,
          seriesTitle: (seriesTitle as string) ?? "",
          seriesImage: (seriesImage as string | null) ?? null,
          season: (season as string) ?? "",
          episodeNum: (episodeNum as string) ?? "",
          episodeTitle: (episodeTitle as string) ?? "",
          position: (position as number) ?? 0,
          duration: (duration as number) ?? 1440,
          savedAt: (savedAt as number) ?? Date.now(),
        },
      });
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to save watch history");
    res.status(500).json({ error: "Failed to save watch history" });
  }
});

router.delete("/user/watch-history/:episodeId", requireAuth, async (req, res) => {
  const episodeId = String(req.params.episodeId);
  try {
    await db
      .delete(watchHistoryTable)
      .where(
        and(
          eq(watchHistoryTable.userId, uid(req)),
          eq(watchHistoryTable.episodeId, episodeId),
        ),
      );
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete watch history entry");
    res.status(500).json({ error: "Failed to delete watch entry" });
  }
});

router.delete("/user/watch-history", requireAuth, async (req, res) => {
  try {
    await db
      .delete(watchHistoryTable)
      .where(eq(watchHistoryTable.userId, uid(req)));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to clear watch history");
    res.status(500).json({ error: "Failed to clear watch history" });
  }
});

// ── Search History ────────────────────────────────────────────────────────────

const MAX_SEARCH_HISTORY = 20;

router.get("/user/search-history", requireAuth, async (req, res) => {
  try {
    const entries = await db
      .select()
      .from(searchHistoryTable)
      .where(eq(searchHistoryTable.userId, uid(req)))
      .orderBy(desc(searchHistoryTable.searchedAt))
      .limit(MAX_SEARCH_HISTORY);
    res.json({ success: true, data: entries });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch search history");
    res.status(500).json({ error: "Failed to fetch search history" });
  }
});

router.post("/user/search-history", requireAuth, async (req, res) => {
  const { query } = req.body as { query?: string };
  if (!query || typeof query !== "string" || query.trim().length < 2) {
    res.status(400).json({ error: "query must be at least 2 characters" });
    return;
  }
  const trimmed = query.trim();
  const userId = uid(req);
  try {
    // Remove existing duplicate entry, then insert fresh (acts as move-to-top)
    await db
      .delete(searchHistoryTable)
      .where(
        and(
          eq(searchHistoryTable.userId, userId),
          eq(searchHistoryTable.query, trimmed),
        ),
      );
    await db.insert(searchHistoryTable).values({
      userId,
      query: trimmed,
      searchedAt: Date.now(),
    });
    // Trim to MAX entries
    const all = await db
      .select({ id: searchHistoryTable.id })
      .from(searchHistoryTable)
      .where(eq(searchHistoryTable.userId, userId))
      .orderBy(desc(searchHistoryTable.searchedAt));
    if (all.length > MAX_SEARCH_HISTORY) {
      const excess = all.slice(MAX_SEARCH_HISTORY).map((e: { id: number }) => e.id);
      for (const id of excess) {
        await db
          .delete(searchHistoryTable)
          .where(eq(searchHistoryTable.id, id));
      }
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to save search history");
    res.status(500).json({ error: "Failed to save search history" });
  }
});

router.delete("/user/search-history", requireAuth, async (req, res) => {
  try {
    await db
      .delete(searchHistoryTable)
      .where(eq(searchHistoryTable.userId, uid(req)));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to clear search history");
    res.status(500).json({ error: "Failed to clear search history" });
  }
});

// ── Bookmarks ─────────────────────────────────────────────────────────────────

router.get("/user/bookmarks", requireAuth, async (req, res) => {
  try {
    const entries = await db
      .select()
      .from(bookmarksTable)
      .where(eq(bookmarksTable.userId, uid(req)))
      .orderBy(desc(bookmarksTable.savedAt));
    res.json({ success: true, data: entries });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch bookmarks");
    res.status(500).json({ error: "Failed to fetch bookmarks" });
  }
});

router.post("/user/bookmarks", requireAuth, async (req, res) => {
  const {
    id, episodeId, seriesSlug, seriesTitle, seriesImage,
    episodeTitle, season, episodeNum, timestamp, savedAt,
  } = req.body as Record<string, unknown>;

  if (!id || !episodeId || !seriesSlug) {
    res.status(400).json({ error: "id, episodeId, and seriesSlug are required" });
    return;
  }
  try {
    await db
      .insert(bookmarksTable)
      .values({
        bookmarkId: id as string,
        userId: uid(req),
        episodeId: episodeId as string,
        seriesSlug: seriesSlug as string,
        seriesTitle: (seriesTitle as string) ?? "",
        seriesImage: (seriesImage as string | null) ?? null,
        episodeTitle: (episodeTitle as string) ?? "",
        season: (season as string) ?? "",
        episodeNum: (episodeNum as string) ?? "",
        timestampStr: (timestamp as string) ?? "0:00",
        savedAt: (savedAt as number) ?? Date.now(),
      })
      .onConflictDoNothing();
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to add bookmark");
    res.status(500).json({ error: "Failed to add bookmark" });
  }
});

router.patch("/user/bookmarks/:id", requireAuth, async (req, res) => {
  const id = String(req.params.id);
  const { timestamp } = req.body as { timestamp?: string };
  if (!timestamp) {
    res.status(400).json({ error: "timestamp is required" });
    return;
  }
  try {
    await db
      .update(bookmarksTable)
      .set({ timestampStr: timestamp })
      .where(
        and(
          eq(bookmarksTable.userId, uid(req)),
          eq(bookmarksTable.bookmarkId, id),
        ),
      );
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to update bookmark");
    res.status(500).json({ error: "Failed to update bookmark" });
  }
});

router.delete("/user/bookmarks/:id", requireAuth, async (req, res) => {
  const id = String(req.params.id);
  try {
    await db
      .delete(bookmarksTable)
      .where(
        and(
          eq(bookmarksTable.userId, uid(req)),
          eq(bookmarksTable.bookmarkId, id),
        ),
      );
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete bookmark");
    res.status(500).json({ error: "Failed to delete bookmark" });
  }
});

router.delete("/user/bookmarks", requireAuth, async (req, res) => {
  try {
    await db
      .delete(bookmarksTable)
      .where(eq(bookmarksTable.userId, uid(req)));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to clear bookmarks");
    res.status(500).json({ error: "Failed to clear bookmarks" });
  }
});

export default router;
