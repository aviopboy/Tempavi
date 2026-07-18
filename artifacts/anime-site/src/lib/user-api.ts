/**
 * Thin client for the /api/user/* endpoints.
 * Uses `credentials: "include"` so the Clerk session cookie is sent automatically.
 */

const BASE = "/api";

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Types (mirrors DB rows) ────────────────────────────────────────────────────

export interface CloudWatchEntry {
  id: number;
  userId: string;
  episodeId: string;
  seriesSlug: string;
  seriesTitle: string;
  seriesImage: string | null;
  season: string;
  episodeNum: string;
  episodeTitle: string;
  position: number;
  duration: number;
  savedAt: number;
}

export interface CloudSearchEntry {
  id: number;
  userId: string;
  query: string;
  searchedAt: number;
}

export interface CloudBookmark {
  bookmarkId: string;
  userId: string;
  episodeId: string;
  seriesSlug: string;
  seriesTitle: string;
  seriesImage: string | null;
  episodeTitle: string;
  season: string;
  episodeNum: string;
  timestampStr: string;
  savedAt: number;
}

// ── Watch History ─────────────────────────────────────────────────────────────

export async function fetchWatchHistory(): Promise<CloudWatchEntry[]> {
  const r = await apiFetch<{ success: boolean; data: CloudWatchEntry[] }>(
    "/user/watch-history",
  );
  return r.data ?? [];
}

export async function saveWatchHistory(
  entry: Omit<CloudWatchEntry, "id" | "userId">,
): Promise<void> {
  await apiFetch("/user/watch-history", {
    method: "POST",
    body: JSON.stringify(entry),
  });
}

export async function deleteWatchEntry(episodeId: string): Promise<void> {
  await apiFetch(`/user/watch-history/${encodeURIComponent(episodeId)}`, {
    method: "DELETE",
  });
}

export async function clearWatchHistory(): Promise<void> {
  await apiFetch("/user/watch-history", { method: "DELETE" });
}

// ── Search History ────────────────────────────────────────────────────────────

export async function fetchSearchHistory(): Promise<CloudSearchEntry[]> {
  const r = await apiFetch<{ success: boolean; data: CloudSearchEntry[] }>(
    "/user/search-history",
  );
  return r.data ?? [];
}

export async function saveSearchQuery(query: string): Promise<void> {
  await apiFetch("/user/search-history", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}

export async function clearSearchHistory(): Promise<void> {
  await apiFetch("/user/search-history", { method: "DELETE" });
}

// ── Bookmarks ─────────────────────────────────────────────────────────────────

export async function fetchBookmarks(): Promise<CloudBookmark[]> {
  const r = await apiFetch<{ success: boolean; data: CloudBookmark[] }>(
    "/user/bookmarks",
  );
  return r.data ?? [];
}

export interface AddBookmarkPayload {
  id: string;
  episodeId: string;
  seriesSlug: string;
  seriesTitle: string;
  seriesImage: string | null;
  episodeTitle: string;
  season: string;
  episodeNum: string;
  timestamp: string;
  savedAt: number;
}

export async function addCloudBookmark(b: AddBookmarkPayload): Promise<void> {
  await apiFetch("/user/bookmarks", {
    method: "POST",
    body: JSON.stringify(b),
  });
}

export async function updateCloudBookmark(
  id: string,
  timestamp: string,
): Promise<void> {
  await apiFetch(`/user/bookmarks/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ timestamp }),
  });
}

export async function removeCloudBookmark(id: string): Promise<void> {
  await apiFetch(`/user/bookmarks/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function clearCloudBookmarks(): Promise<void> {
  await apiFetch("/user/bookmarks", { method: "DELETE" });
}
