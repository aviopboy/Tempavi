import { pgTable, text, real, bigint, serial, unique } from "drizzle-orm/pg-core";

// ── Watch History ─────────────────────────────────────────────────────────────
// One row per (userId, episodeId) — upserted on each progress save.
export const watchHistoryTable = pgTable(
  "watch_history",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    episodeId: text("episode_id").notNull(),
    seriesSlug: text("series_slug").notNull(),
    seriesTitle: text("series_title").notNull(),
    seriesImage: text("series_image"),
    season: text("season").notNull(),
    episodeNum: text("episode_num").notNull(),
    episodeTitle: text("episode_title").notNull(),
    position: real("position").notNull().default(0),
    duration: real("duration").notNull().default(1440),
    savedAt: bigint("saved_at", { mode: "number" }).notNull(),
  },
  (t) => [unique("wh_user_episode_uniq").on(t.userId, t.episodeId)],
);

export type WatchHistoryRow = typeof watchHistoryTable.$inferSelect;

// ── Search History ────────────────────────────────────────────────────────────
// Up to 20 per user, deduplicated by query text.
export const searchHistoryTable = pgTable("search_history", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  query: text("query").notNull(),
  searchedAt: bigint("searched_at", { mode: "number" }).notNull(),
});

export type SearchHistoryRow = typeof searchHistoryTable.$inferSelect;

// ── Bookmarks ─────────────────────────────────────────────────────────────────
// Primary key is (userId, bookmarkId) — bookmarkId is client-generated.
export const bookmarksTable = pgTable(
  "bookmarks",
  {
    bookmarkId: text("bookmark_id").notNull(),
    userId: text("user_id").notNull(),
    episodeId: text("episode_id").notNull(),
    seriesSlug: text("series_slug").notNull(),
    seriesTitle: text("series_title").notNull(),
    seriesImage: text("series_image"),
    episodeTitle: text("episode_title").notNull(),
    season: text("season").notNull(),
    episodeNum: text("episode_num").notNull(),
    timestampStr: text("timestamp_str").notNull(),
    savedAt: bigint("saved_at", { mode: "number" }).notNull(),
  },
  (t) => [unique("bm_user_bookmark_uniq").on(t.userId, t.bookmarkId)],
);

export type BookmarkRow = typeof bookmarksTable.$inferSelect;
