/**
 * Shared localStorage helpers for watch progress.
 * Extracted so both use-watch-progress.ts and the cloud sync context can share them.
 */

import type { ProgressEntry } from "./use-watch-progress";

const KEY = "avistream_progress";

export function load(): Record<string, ProgressEntry> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, ProgressEntry>;
  } catch {
    return {};
  }
}

export function persist(data: Record<string, ProgressEntry>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch { /**/ }
}
