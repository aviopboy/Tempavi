import { useState, useCallback, useEffect } from "react";
import { SYNC_EVENT } from "./use-watch-progress";
import { load, persist } from "./use-bookmarks-storage";

export type Bookmark = {
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
};

export { load, persist };

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function useBookmarks() {
  const [items, setItems] = useState<Bookmark[]>(load);

  const refresh = useCallback(() => setItems(load()), []);

  // Re-read from localStorage when cloud sync merges data or clears bookmarks
  useEffect(() => {
    const handler = () => setItems(load());
    window.addEventListener(SYNC_EVENT, handler);
    return () => window.removeEventListener(SYNC_EVENT, handler);
  }, []);

  const addBookmark = useCallback((b: Omit<Bookmark, "id" | "savedAt">): Bookmark => {
    const newBookmark: Bookmark = { ...b, id: uid(), savedAt: Date.now() };
    const next = [newBookmark, ...load()];
    persist(next);
    setItems(next);
    return newBookmark;
  }, []);

  const removeBookmark = useCallback((id: string) => {
    const next = load().filter((x) => x.id !== id);
    persist(next);
    setItems(next);
  }, []);

  const updateBookmark = useCallback((id: string, timestamp: string) => {
    const next = load().map((x) => x.id === id ? { ...x, timestamp } : x);
    persist(next);
    setItems(next);
  }, []);

  return { items, refresh, addBookmark, removeBookmark, updateBookmark };
}

export function getEpisodeBookmarks(episodeId: string): Bookmark[] {
  return load().filter((b) => b.episodeId === episodeId);
}
