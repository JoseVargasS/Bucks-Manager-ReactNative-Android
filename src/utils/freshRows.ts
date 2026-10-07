import { useSyncExternalStore } from "react";

// Fresh-row marks for the new-transaction flash (P2 polish). Keyed by
// createdAtMs so no keyExtractor, cache, or prop plumbing changes are needed:
// a recycled row instance renders a different tx whose mark reads false, and a
// remounted old row (renumber shifts keys) carries an old timestamp.
// Marks expire silently; no timers, no re-render on expiry (the flash already
// played). Not persisted — reloads rebuild state from the sheet.
const FRESH_WINDOW_MS = 2000;

let version = 0;
const marks = new Map<number, number>();
const listeners = new Set<() => void>();

function emit() {
  version += 1;
  listeners.forEach((listener) => listener());
}

export function markFreshCreatedAt(values: Array<number | undefined>): void {
  const now = Date.now();
  let changed = false;
  for (const value of values) {
    if (value == null || Number.isNaN(value)) continue;
    marks.set(value, now);
    changed = true;
  }
  if (!changed) return;
  for (const [key, markedAt] of marks) {
    if (now - markedAt > FRESH_WINDOW_MS) marks.delete(key);
  }
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getVersion(): number {
  return version;
}

/** True while the given createdAtMs was marked fresh by a recent mutation. */
export function useFreshCreatedAt(createdAtMs?: number): boolean {
  useSyncExternalStore(subscribe, getVersion);
  if (createdAtMs == null) return false;
  const markedAt = marks.get(createdAtMs);
  return markedAt !== undefined && Date.now() - markedAt <= FRESH_WINDOW_MS;
}
