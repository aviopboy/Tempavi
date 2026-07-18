import { useState, useCallback, useEffect } from "react";

/** Fired by UserDataProvider after cloud sync or clear so all consumers refresh. */
export const SYNC_EVENT = "avistream:data-synced";
import { load, persist } from "./use-watch-progress-storage";

export type ProgressEntry = {
  episodeId: string;
  seriesSlug: string;
  seriesTitle: string;
  seriesImage: string | null;
  season: string;
  episodeNum: string;
  episodeTitle: string;
  position: number;   // seconds elapsed (wall-clock tracking)
  duration: number;   // estimated total seconds
  savedAt: number;
};

export { load, persist };

export const DEFAULT_DURATION = 1440; // 24 min — typical anime episode
export const WATCHED_THRESHOLD = 0.85; // 85% = counts as watched

export function saveProgress(entry: Omit<ProgressEntry, "savedAt">) {
  const data = load();
  data[entry.episodeId] = { ...entry, savedAt: Date.now() };
  persist(data);
}

export function getProgress(episodeId: string): ProgressEntry | null {
  return load()[episodeId] ?? null;
}

export function getAllProgress(): ProgressEntry[] {
  return Object.values(load()).sort((a, b) => b.savedAt - a.savedAt);
}

export function markWatched(episodeId: string, entry?: Omit<ProgressEntry, "savedAt" | "position">) {
  const data = load();
  const existing = data[episodeId];
  if (existing) {
    data[episodeId] = { ...existing, position: existing.duration, savedAt: Date.now() };
  } else if (entry) {
    data[episodeId] = { ...entry, position: entry.duration, savedAt: Date.now() };
  }
  persist(data);
}

export function removeProgress(episodeId: string) {
  const data = load();
  delete data[episodeId];
  persist(data);
}

export function isWatched(episodeId: string): boolean {
  const p = getProgress(episodeId);
  if (!p) return false;
  return p.position / p.duration >= WATCHED_THRESHOLD;
}

export function getProgressPct(episodeId: string): number {
  const p = getProgress(episodeId);
  if (!p || p.position <= 0) return 0;
  return Math.min(1, p.position / p.duration);
}

export function useWatchProgress() {
  const [data, setData] = useState<Record<string, ProgressEntry>>(load);

  const refresh = useCallback(() => setData(load()), []);

  // Re-read from localStorage when cloud sync merges data or clears history
  useEffect(() => {
    const handler = () => setData(load());
    window.addEventListener(SYNC_EVENT, handler);
    return () => window.removeEventListener(SYNC_EVENT, handler);
  }, []);

  const entries = Object.values(data).sort((a, b) => b.savedAt - a.savedAt);
  const inProgress = entries.filter((e) => {
    const pct = e.position / e.duration;
    return pct >= 0.02 && pct < WATCHED_THRESHOLD;
  });

  return { entries, inProgress, refresh };
}
