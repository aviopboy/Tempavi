import { useState, useCallback } from "react";

export type RecentItem = {
  slug: string;
  title: string;
  image: string | null;
};

const KEY = "avistream_recent";
const MAX = 20;

function load(): RecentItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as RecentItem[];
  } catch {
    return [];
  }
}

export function addRecentWatched(item: RecentItem) {
  const prev = load().filter((r) => r.slug !== item.slug);
  const next = [item, ...prev].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* ignore */ }
}

export function useRecentWatched() {
  const [items, setItems] = useState<RecentItem[]>(load);

  const refresh = useCallback(() => setItems(load()), []);

  const clear = useCallback(() => {
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
    setItems([]);
  }, []);

  return { items, refresh, clear };
}
