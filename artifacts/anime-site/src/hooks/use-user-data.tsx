/**
 * UserDataContext — provides cloud-synced watch history, search history,
 * and bookmarks for signed-in users. Falls back to localStorage seamlessly.
 *
 * Write-through pattern:
 *  1. Write to localStorage immediately (instant UI update)
 *  2. Fire-and-forget sync to API in the background
 *
 * On sign-in:
 *  - Fetches data from API and merges it into localStorage, then refreshes hooks.
 */

import {
  createContext, useContext, useEffect, useRef, useState,
  useCallback, type ReactNode,
} from "react";
import { SYNC_EVENT } from "@/hooks/use-watch-progress";
import { useAuth } from "@clerk/react";
import type { Bookmark } from "@/hooks/use-bookmarks";
import type { ProgressEntry } from "@/hooks/use-watch-progress";
import type { RecentItem } from "@/hooks/use-recent-watched";
import {
  load as loadProgress, persist as persistProgress,
} from "@/hooks/use-watch-progress-storage";
import {
  load as loadBookmarks, persist as persistBookmarks,
} from "@/hooks/use-bookmarks-storage";
import { addRecentWatched } from "@/hooks/use-recent-watched";
import {
  fetchWatchHistory, saveWatchHistory,
  deleteWatchEntry as apiDeleteWatchEntry,
  clearWatchHistory as apiClearWatchHistory,
  fetchSearchHistory, saveSearchQuery,
  clearSearchHistory as apiClearSearchHistory,
  fetchBookmarks, addCloudBookmark, updateCloudBookmark,
  removeCloudBookmark, clearCloudBookmarks,
} from "@/lib/user-api";

// ── Search history localStorage ───────────────────────────────────────────────
const SEARCH_KEY = "avistream_search_history";
const MAX_SEARCH = 20;

function loadSearchHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(SEARCH_KEY) ?? "[]") as string[]; }
  catch { return []; }
}
function persistSearchHistory(items: string[]) {
  try { localStorage.setItem(SEARCH_KEY, JSON.stringify(items)); } catch { /**/ }
}

export function addLocalSearch(query: string) {
  const prev = loadSearchHistory().filter((q) => q !== query);
  persistSearchHistory([query, ...prev].slice(0, MAX_SEARCH));
}

// ── Context ───────────────────────────────────────────────────────────────────

interface UserDataCtx {
  // Search history (last 20)
  searchHistory: string[];
  pushSearch: (query: string) => void;
  clearSearchHistory: () => void;
  // Watch history controls (for account page)
  clearWatchHistory: () => void;
  removeWatchEntry: (episodeId: string) => void;
  // Bookmark cloud sync helpers (called from watch.tsx)
  pushBookmark: (b: Bookmark) => void;
  removeBookmark: (id: string) => void;
  updateBookmark: (id: string, timestamp: string) => void;
  clearBookmarks: () => void;
  // Progress cloud sync helper (called from watch.tsx)
  pushProgress: (entry: ProgressEntry) => void;
  // Loading state
  synced: boolean;
}

const UserDataContext = createContext<UserDataCtx>({
  searchHistory: [],
  pushSearch: () => undefined,
  clearSearchHistory: () => undefined,
  clearWatchHistory: () => undefined,
  removeWatchEntry: () => undefined,
  pushBookmark: () => undefined,
  removeBookmark: () => undefined,
  updateBookmark: () => undefined,
  clearBookmarks: () => undefined,
  pushProgress: () => undefined,
  synced: false,
});

export function useUserData() {
  return useContext(UserDataContext);
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function UserDataProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const [searchHistory, setSearchHistory] = useState<string[]>(loadSearchHistory);
  const [synced, setSynced] = useState(false);
  const prevSignedIn = useRef<boolean | null>(null);

  // ── Initial load from API when user signs in ──────────────────────────────
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      // Signed out — reset synced flag and load localStorage
      if (prevSignedIn.current === true) {
        setSynced(false);
      }
      prevSignedIn.current = false;
      setSearchHistory(loadSearchHistory());
      return;
    }
    if (prevSignedIn.current === true && synced) return; // already synced this session
    prevSignedIn.current = true;

    (async () => {
      try {
        const [watchRows, searchRows, bookmarkRows] = await Promise.all([
          fetchWatchHistory(),
          fetchSearchHistory(),
          fetchBookmarks(),
        ]);

        // Merge watch history into localStorage (cloud wins for any given episodeId)
        const localProgress = loadProgress();
        for (const row of watchRows) {
          const local = localProgress[row.episodeId];
          // Keep the more recently saved version
          if (!local || row.savedAt > local.savedAt) {
            localProgress[row.episodeId] = {
              episodeId: row.episodeId,
              seriesSlug: row.seriesSlug,
              seriesTitle: row.seriesTitle,
              seriesImage: row.seriesImage ?? null,
              season: row.season,
              episodeNum: row.episodeNum,
              episodeTitle: row.episodeTitle,
              position: row.position,
              duration: row.duration,
              savedAt: row.savedAt,
            };
          }
          // Also update recent watched from cloud history
          addRecentWatched({
            slug: row.seriesSlug,
            title: row.seriesTitle,
            image: row.seriesImage ?? null,
          } satisfies RecentItem);
        }
        persistProgress(localProgress);

        // Merge bookmarks into localStorage (cloud wins)
        const localBookmarks = loadBookmarks();
        const cloudIds = new Set(bookmarkRows.map((b) => b.bookmarkId));
        // Keep local ones not in cloud
        const merged: Bookmark[] = [
          ...localBookmarks.filter((b) => !cloudIds.has(b.id)),
          ...bookmarkRows.map((b) => ({
            id: b.bookmarkId,
            episodeId: b.episodeId,
            seriesSlug: b.seriesSlug,
            seriesTitle: b.seriesTitle,
            seriesImage: b.seriesImage ?? null,
            episodeTitle: b.episodeTitle,
            season: b.season,
            episodeNum: b.episodeNum,
            timestamp: b.timestampStr,
            savedAt: b.savedAt,
          })),
        ].sort((a, b) => b.savedAt - a.savedAt);
        persistBookmarks(merged);

        // Merge search history
        const cloudQueries = searchRows.map((r) => r.query);
        const localQueries = loadSearchHistory();
        const combined = [
          ...cloudQueries,
          ...localQueries.filter((q) => !cloudQueries.includes(q)),
        ].slice(0, MAX_SEARCH);
        persistSearchHistory(combined);
        setSearchHistory(combined);

        setSynced(true);
        window.dispatchEvent(new CustomEvent(SYNC_EVENT));
      } catch {
        // Silently fail — localStorage data remains usable
        setSynced(true);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, isLoaded]);

  // ── Push helpers ──────────────────────────────────────────────────────────

  const pushProgress = useCallback((entry: ProgressEntry) => {
    if (!isSignedIn) return;
    saveWatchHistory(entry).catch(() => { /* silent */ });
  }, [isSignedIn]);

  const pushSearch = useCallback((query: string) => {
    // Always update localStorage
    addLocalSearch(query);
    setSearchHistory(loadSearchHistory());
    if (!isSignedIn) return;
    saveSearchQuery(query).catch(() => { /* silent */ });
  }, [isSignedIn]);

  const clearSearchHistoryFn = useCallback(() => {
    persistSearchHistory([]);
    setSearchHistory([]);
    if (!isSignedIn) return;
    apiClearSearchHistory().catch(() => { /* silent */ });
  }, [isSignedIn]);

  const clearWatchHistoryFn = useCallback(() => {
    persistProgress({});
    // Also clear localStorage recent
    try { localStorage.removeItem("avistream_recent"); } catch { /**/ }
    window.dispatchEvent(new CustomEvent(SYNC_EVENT));
    if (!isSignedIn) return;
    apiClearWatchHistory().catch(() => { /* silent */ });
  }, [isSignedIn]);

  const removeWatchEntry = useCallback((episodeId: string) => {
    const data = loadProgress();
    delete data[episodeId];
    persistProgress(data);
    window.dispatchEvent(new CustomEvent(SYNC_EVENT));
    if (!isSignedIn) return;
    apiDeleteWatchEntry(episodeId).catch(() => { /* silent */ });
  }, [isSignedIn]);

  const pushBookmark = useCallback((b: Bookmark) => {
    if (!isSignedIn) return;
    addCloudBookmark({
      id: b.id,
      episodeId: b.episodeId,
      seriesSlug: b.seriesSlug,
      seriesTitle: b.seriesTitle,
      seriesImage: b.seriesImage,
      episodeTitle: b.episodeTitle,
      season: b.season,
      episodeNum: b.episodeNum,
      timestamp: b.timestamp,
      savedAt: b.savedAt,
    }).catch(() => { /* silent */ });
  }, [isSignedIn]);

  const removeBookmarkFn = useCallback((id: string) => {
    if (!isSignedIn) return;
    removeCloudBookmark(id).catch(() => { /* silent */ });
  }, [isSignedIn]);

  const updateBookmarkFn = useCallback((id: string, timestamp: string) => {
    if (!isSignedIn) return;
    updateCloudBookmark(id, timestamp).catch(() => { /* silent */ });
  }, [isSignedIn]);

  const clearBookmarksFn = useCallback(() => {
    persistBookmarks([]);
    window.dispatchEvent(new CustomEvent(SYNC_EVENT));
    if (!isSignedIn) return;
    clearCloudBookmarks().catch(() => { /* silent */ });
  }, [isSignedIn]);

  return (
    <UserDataContext.Provider value={{
      searchHistory,
      pushSearch,
      clearSearchHistory: clearSearchHistoryFn,
      clearWatchHistory: clearWatchHistoryFn,
      removeWatchEntry,
      pushBookmark,
      removeBookmark: removeBookmarkFn,
      updateBookmark: updateBookmarkFn,
      clearBookmarks: clearBookmarksFn,
      pushProgress,
      synced,
    }}>
      {children}
    </UserDataContext.Provider>
  );
}
