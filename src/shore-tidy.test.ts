import { describe, expect, it } from "vitest";
import { generateMap } from "./generator";
import { MAX_BANK, MIN_LAND, tidyShore } from "./shore-tidy";
import { coastLines, DEEPEST_COAST_LINE } from "./style-coast";
import { defaultSettings } from "./types";
import type { MapData } from "./types";

const SEA = 0.44,
  OPEN = 0.1;

/** An open sea with the given cells raised: a map of just heights and a sea level. */
function sea(cols: number, rows: number, raised: [number, number, number][]) {
  const heights = new Array(cols * rows).fill(OPEN);
  for (const [x, y, h] of raised) heights[y * cols + x] = h;
  return {
    cols,
    rows,
    heights,
    settings: { seaLevel: SEA },
  } as unknown as MapData;
}

/** A solid block of cells at one height. */
const block = (x0: number, y0: number, w: number, h: number, v: number) => {
  const out: [number, number, number][] = [];
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) out.push([x, y, v]);
  return out;
};

/** The 2 x 2 squares a contour at this level passes through. */
function crossings(map: MapData, level: number) {
  const { cols, rows, heights } = map;
  let n = 0;
  for (let y = 0; y < rows - 1; y++)
    for (let x = 0; x < cols - 1; x++) {
      const i = y * cols + x,
        mask = [i, i + 1, i + cols, i + cols + 1].map(
          (j) => heights[j] >= level,
        );
      if (mask.some((m) => m !== mask[0])) n++;
    }
  return n;
}

describe("tidying a generated coast", () => {
  it("sinks land too small to be an island, however it touches itself", () => {
    const lone = sea(40, 40, [[5, 5, 0.6]]),
      line = sea(40, 40, block(5, 5, MIN_LAND - 1, 1, 0.6)),
      diagonal = sea(40, 40, [
        [5, 5, 0.6],
        [6, 6, 0.6],
        [7, 7, 0.6],
      ]);
    for (const map of [lone, line, diagonal]) {
      tidyShore(map);
      expect(map.heights.every((h) => h < SEA)).toBe(true);
    }
  });

  it("keeps an islet of MIN_LAND cells, and a whole island with its shallows", () => {
    const shelf = [
        ...block(10, 10, 20, 20, SEA - 0.03),
        ...block(14, 14, 12, 12, 0.6),
      ],
      islet = sea(40, 40, [
        ...block(3, 3, 7, 6, SEA - 0.05),
        ...block(5, 5, 3, 2, 0.6),
      ]),
      island = sea(40, 40, shelf);
    const before = [islet, island].map((m) => [...m.heights]);
    tidyShore(islet);
    tidyShore(island);
    expect(islet.heights).toEqual(before[0]);
    expect(island.heights).toEqual(before[1]);
  });

  it("removes a bank with no land on it up to MAX_BANK cells, and every line drawn round it", () => {
    const side = Math.floor(Math.sqrt(MAX_BANK)),
      map = sea(60, 60, [
        ...block(20, 20, side, side, SEA - 0.01),
        ...block(21, 21, side - 2, side - 2, SEA - 0.001),
      ]);
    // Each style draws lines at its own depths; at least one passes the bank today.
    const levels = ["fantasy", "ink", "atlas"].flatMap((style) =>
      coastLines(style).map((l) => SEA + l.offset),
    );
    expect(levels.some((level) => crossings(map, level) > 0)).toBe(true);
    tidyShore(map);
    for (const level of levels) expect(crossings(map, level)).toBe(0);
    expect(map.heights.every((h) => h < SEA - DEEPEST_COAST_LINE)).toBe(true);
  });

  it("keeps a bank too big to be a speck, as a reef", () => {
    const map = sea(60, 60, block(10, 10, 10, 10, SEA - 0.02)),
      before = [...map.heights];
    tidyShore(map);
    expect(map.heights).toEqual(before);
  });

  it("keeps a small bank that joins an island's shallows", () => {
    // The bank is cut off from the island at the shore line but not at the
    // deepest line a style draws, so Old ink draws it as part of the coast.
    const map = sea(60, 60, [
        ...block(10, 10, 20, 20, 0.6),
        ...block(30, 18, 5, 2, SEA - 0.05),
      ]),
      before = [...map.heights];
    tidyShore(map);
    expect(map.heights).toEqual(before);
  });

  it("sinks a speck on a bank without touching the bank", () => {
    const bank = block(10, 10, 12, 12, SEA - 0.03),
      map = sea(60, 60, [...bank, [15, 15, 0.5]]);
    tidyShore(map);
    expect(map.heights[15 * 60 + 15]).toBeLessThan(SEA);
    expect(map.heights[15 * 60 + 15]).toBeGreaterThan(SEA - 0.03 - 0.01);
    expect(map.heights[12 * 60 + 12]).toBe(SEA - 0.03);
  });

  it("changes nothing the second time", () => {
    const map = sea(60, 60, [
      ...block(10, 10, 20, 20, 0.6),
      [45, 45, 0.5],
      ...block(40, 10, 4, 4, SEA - 0.02),
    ]);
    tidyShore(map);
    const once = [...map.heights];
    tidyShore(map);
    expect(map.heights).toEqual(once);
  });

  it("leaves no speck or small bank in worlds generated from seeds that had them", () => {
    for (const [seed, template] of [
      ["ALPHA", "continents"],
      ["BRAVO", "pangaea"],
    ]) {
      const map = generateMap(
        "world",
        { ...defaultSettings, seed, template },
        "t",
        "t",
        { cols: 560, rows: 400 },
      );
      const { cols, rows, heights } = map,
        sea = map.settings.seaLevel;
      // Count the groups by flooding each, as the pass does, but in a loop of our own.
      const scan = (level: number) => {
        const seen = new Uint8Array(heights.length),
          found: { size: number; land: boolean }[] = [];
        for (let s = 0; s < heights.length; s++) {
          if (seen[s] || heights[s] < level) continue;
          const stack = [s];
          let size = 0,
            land = false;
          seen[s] = 1;
          while (stack.length) {
            const i = stack.pop()!;
            size++;
            land ||= heights[i] >= sea;
            const x = i % cols,
              y = (i - x) / cols;
            for (let dy = -1; dy <= 1; dy++)
              for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx,
                  ny = y + dy;
                if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
                const j = ny * cols + nx;
                if (seen[j] || heights[j] < level) continue;
                seen[j] = 1;
                stack.push(j);
              }
          }
          found.push({ size, land });
        }
        return found;
      };
      expect(scan(sea).filter((g) => g.size < MIN_LAND)).toEqual([]);
      expect(
        scan(sea - DEEPEST_COAST_LINE).filter(
          (g) => !g.land && g.size <= MAX_BANK,
        ),
      ).toEqual([]);
    }
  });
});
