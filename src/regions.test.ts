import { describe, expect, it } from "vitest";
import { generateMap } from "./generator";
import { defaultSettings } from "./types";

const maps = ["ALPHA", "BRAVO", "CHARLIE", "DELTA"].map((seed) =>
  generateMap("world", { ...defaultSettings, seed }),
);
/** Smoothing may cut a coastal corner by under a cell, but never run into open water. */
const nearLand = (map: (typeof maps)[number], p: { x: number; y: number }) => {
  const cx = p.x / (map.width / map.cols),
    cy = p.y / (map.height / map.rows);
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++) {
      const x = Math.round(cx) + dx,
        y = Math.round(cy) + dy;
      if (
        x >= 0 &&
        y >= 0 &&
        x < map.cols &&
        y < map.rows &&
        Math.hypot(x - cx, y - cy) <= 1.2 &&
        map.heights[y * map.cols + x] >= map.settings.seaLevel
      )
        return true;
    }
  return false;
};

describe("world roads and borders", () => {
  it("keeps every road on dry land instead of crossing the sea", () => {
    for (const map of maps) {
      const roads = map.paths.filter((p) => p.id.startsWith("route-"));
      expect(roads.length).toBeGreaterThan(0);
      for (const road of roads)
        for (const point of road.points)
          expect(nearLand(map, point)).toBe(true);
    }
  });
  it("links each road to real settlements at both ends", () => {
    for (const map of maps) {
      const places = map.objects.filter((o) => o.id.startsWith("settlement-"));
      for (const road of map.paths.filter((p) => p.id.startsWith("route-"))) {
        for (const end of [road.points[0], road.points.at(-1)!])
          expect(places.some((o) => o.x === end.x && o.y === end.y)).toBe(true);
      }
    }
  });
  it("traces kingdom borders as a few long continuous lines, not scattered dashes", () => {
    for (const map of maps) {
      const borders = map.paths.filter((p) => p.kind === "border");
      expect(borders.length).toBeGreaterThan(0);
      expect(borders.length).toBeLessThan(40);
      for (const border of borders) {
        expect(border.points.length).toBeGreaterThanOrEqual(5);
        // Smoothing keeps neighbouring points close: no jumps across the map.
        for (let i = 1; i < border.points.length; i++)
          expect(
            Math.hypot(
              border.points[i].x - border.points[i - 1].x,
              border.points[i].y - border.points[i - 1].y,
            ),
          ).toBeLessThan(12);
      }
    }
  });
});
