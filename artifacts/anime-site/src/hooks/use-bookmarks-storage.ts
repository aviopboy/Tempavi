/**
 * Shared localStorage helpers for bookmarks.
 * Extracted so both use-bookmarks.ts and the cloud sync context can share them.
 */

import type { Bookmark } from "./use-bookmarks";

const KEY = "avistream_bookmarks";

export function load(): Bookmark[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Bookmark[];
  } catch {
    return [];
  }
}

export function persist(items: Bookmark[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch { /* ignore */ }
}
