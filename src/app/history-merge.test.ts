import { describe, expect, it } from "vitest";
import { pushEntry } from "./history-merge";
import type { HistoryEntry } from "./history-merge";
import type { Project } from "../types";

const p = (n: number) => ({ id: `p${n}` }) as unknown as Project;
const start: HistoryEntry[] = [{ project: p(0), label: "Starting map" }];
const LIMIT = 100,
  MERGE = 1500;
const push = (
  h: HistoryEntry[],
  i: number,
  n: number,
  at: number,
  key?: string,
) =>
  pushEntry(h, i, { project: p(n), label: `edit ${n}`, key }, at, LIMIT, MERGE);

describe("pushEntry", () => {
  it("adds a step for an edit without a key", () => {
    const h = push(push(start, 0, 1, 0), 1, 2, 10);
    expect(h.map((e) => e.label)).toEqual(["Starting map", "edit 1", "edit 2"]);
  });

  it("merges typing in one field into one step, and keeps the last text", () => {
    let h = start;
    for (let n = 1; n <= 20; n++)
      h = push(h, h.length - 1, n, n * 100, "type:name:a");
    expect(h).toHaveLength(2);
    expect(h[1].project).toEqual(p(20));
  });

  it("starts a new step after a pause, for another field, or for another object", () => {
    let h = push(start, 0, 1, 0, "type:name:a");
    h = push(h, 1, 2, 2000, "type:name:a");
    expect(h).toHaveLength(3);
    h = push(h, 2, 3, 2100, "type:x:a");
    expect(h).toHaveLength(4);
    h = push(h, 3, 4, 2200, "type:x:b");
    expect(h).toHaveLength(5);
  });

  it("never replaces the starting map, or a step made without a key", () => {
    const h = push(start, 0, 1, 0, "type:name:a");
    expect(h[0].label).toBe("Starting map");
    let g = push(start, 0, 1, 0);
    g = push(g, 1, 2, 10, "type:name:a");
    expect(g).toHaveLength(3);
  });

  it("drops the undone branch, then merges only with the step now at the end", () => {
    let h = push(push(push(start, 0, 1, 0), 1, 2, 10), 2, 3, 20, "type:name:a");
    h = push(h, 0, 4, 30, "type:name:a");
    expect(h.map((e) => e.label)).toEqual(["Starting map", "edit 4"]);
  });

  it("keeps at most the limit, dropping the oldest", () => {
    let h = start;
    for (let n = 1; n <= 130; n++) h = push(h, h.length - 1, n, n * 5000);
    expect(h).toHaveLength(LIMIT);
    expect(h.at(-1)!.label).toBe("edit 130");
  });
});
