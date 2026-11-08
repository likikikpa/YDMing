import type { Project } from "../types";

/** One step of the undo history. */
export interface HistoryEntry {
  project: Project;
  label: string;
  /** Edits with the same key close together are one step: typing a name. */
  key?: string;
  at?: number;
}

/**
 * The history after a new step at `index`. Steps after `index` are dropped
 * (an undone branch). A step with a `key` replaces the one before it when
 * that has the same key and came less than `mergeMs` earlier, so typing a
 * label is one step to undo, not one per letter that pushes real work out of
 * the capped history. The starting map is never replaced.
 */
export function pushEntry(
  entries: HistoryEntry[],
  index: number,
  step: { project: Project; label: string; key?: string },
  now: number,
  limit: number,
  mergeMs: number,
): HistoryEntry[] {
  const upto = entries.slice(0, index + 1),
    last = upto.at(-1),
    merge =
      step.key !== undefined &&
      upto.length > 1 &&
      last?.key === step.key &&
      now - (last.at ?? 0) < mergeMs;
  return [...(merge ? upto.slice(0, -1) : upto), { ...step, at: now }].slice(
    -limit,
  );
}
