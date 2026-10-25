import { describe, expect, it } from "vitest";
import { findRoute, landmasses, reachable } from "./route-search";
import type { MapData } from "./types";

/** A 12 × 6 grid: "#" is land, "." is sea. */
function grid(rows: string[]) {
  const cols = rows[0].length;
  return {
    cols,
    rows: rows.length,
    heights: Float32Array.from(rows.join(""), (c) => (c === "#" ? 0.6 : 0.2)),
    settings: { seaLevel: 0.4 },
  } as unknown as MapData;
}
const map = grid([
  "............",
  ".###....###.",
  ".###....###.",
  ".###.....#..",
  "...........#",
  "............",
]);
const at = (x: number, y: number) => y * map.cols + x;

describe("route search", () => {
  it("numbers each landmass, leaving the sea and the map's edge out", () => {
    const land = landmasses(map);
    expect(land[at(1, 1)]).toBe(land[at(3, 3)]);
    expect(land[at(8, 1)]).toBe(land[at(9, 3)]);
    expect(land[at(1, 1)]).not.toBe(land[at(8, 1)]);
    expect(land[at(0, 0)]).toBe(0);
    // Land on the map's edge cannot be crossed by a route.
    expect(land[at(11, 4)]).toBe(0);
  });

  it("agrees with the search on which places can be joined", () => {
    const land = landmasses(map);
    for (const [from, to] of [
      [at(1, 1), at(3, 3)],
      [at(1, 1), at(9, 2)],
      // A place in the sea next to the shore starts on that shore.
      [at(4, 2), at(1, 3)],
      [at(4, 2), at(8, 2)],
      [at(0, 0), at(1, 1)],
      [at(2, 2), at(11, 4)],
    ])
      expect(reachable(map, land, from, to)).toBe(
        findRoute(map, from, to) !== null,
      );
  });
});
