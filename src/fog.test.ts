import { describe, expect, it } from "vitest";
import {
  anyHidden,
  copyFog,
  decodeFog,
  encodeFog,
  fogCellSize,
  fogOf,
  newFogGrid,
  paintBox,
  paintDisc,
  paintLine,
  roomAt,
  shiftFog,
  validFog,
} from "./fog";
import type { MapData } from "./types";

const size = { width: 1200, height: 850 };
const asMap = (extra: Partial<MapData> = {}) =>
  ({ ...size, rooms: [], ...extra }) as MapData;
const revealed = (grid: ReturnType<typeof newFogGrid>) =>
  grid.hidden.reduce((n, v) => n + (v ? 0 : 1), 0);

describe("fog grid", () => {
  it("uses 8 px cells on a normal map and a capped grid on a huge one", () => {
    expect(fogCellSize(size)).toBe(8);
    const huge = { width: 3200, height: 3200 };
    const g = newFogGrid(huge, true);
    expect(g.cols * g.rows).toBeLessThanOrEqual(40000);
    expect(g.cell * g.cols).toBeGreaterThanOrEqual(huge.width);
  });

  it("round-trips through run lengths whatever the first cell is", () => {
    for (const first of [0, 1]) {
      const g = newFogGrid(size, false);
      g.hidden[0] = first;
      g.hidden[5] = 1 - first;
      g.hidden[g.hidden.length - 1] = 1;
      const back = decodeFog(encodeFog(g));
      expect(Array.from(back.hidden)).toEqual(Array.from(g.hidden));
    }
  });

  it("stores a fully hidden or fully clear grid as one or two runs", () => {
    const n = newFogGrid(size, true).hidden.length;
    expect(encodeFog(newFogGrid(size, true)).runs).toEqual([n]);
    expect(encodeFog(newFogGrid(size, false)).runs).toEqual([0, n]);
  });

  it("ignores fog that no longer fits the map", () => {
    const fog = encodeFog(newFogGrid(size, true));
    expect(fogOf(asMap({ fog }))).toBeDefined();
    expect(fogOf(asMap({ fog, width: 1600 }))).toBeUndefined();
    expect(fogOf(asMap())).toBeUndefined();
  });

  it("copies before painting so saved fog is never changed", () => {
    const fog = encodeFog(newFogGrid(size, true));
    const map = asMap({ fog });
    const copy = copyFog(map);
    copy.hidden.fill(0);
    expect(fogOf(map)!.hidden.every((v) => v === 1)).toBe(true);
    expect(copyFog(asMap()).hidden.every((v) => v === 0)).toBe(true);
  });
});

describe("fog brush", () => {
  it("reveals a round area and nothing outside it", () => {
    const g = newFogGrid(size, true);
    expect(paintDisc(g, { x: 600, y: 400 }, 40, false)).toBe(true);
    const reveal = revealed(g);
    // About pi * 40^2 / 8^2 cells.
    expect(reveal).toBeGreaterThan(60);
    expect(reveal).toBeLessThan(90);
    expect(g.hidden[0]).toBe(1);
    expect(g.hidden[Math.floor(400 / 8) * g.cols + Math.floor(600 / 8)]).toBe(
      0,
    );
  });

  it("marks a cell even when the brush is smaller than one", () => {
    const g = newFogGrid(size, true);
    expect(paintDisc(g, { x: 100, y: 100 }, 1, false)).toBe(true);
    expect(revealed(g)).toBe(1);
  });

  it("reports no change when the cells already have that state", () => {
    const g = newFogGrid(size, true);
    expect(paintDisc(g, { x: 100, y: 100 }, 30, true)).toBe(false);
  });

  it("hides again what was revealed", () => {
    const g = newFogGrid(size, true);
    paintDisc(g, { x: 300, y: 300 }, 50, false);
    paintDisc(g, { x: 300, y: 300 }, 50, true);
    expect(revealed(g)).toBe(0);
  });

  it("leaves no gap along a fast drag", () => {
    const g = newFogGrid(size, true);
    paintLine(g, { x: 50, y: 400 }, { x: 1150, y: 400 }, 12, false);
    const row = Math.floor(400 / 8);
    for (let x = Math.floor(50 / 8); x <= Math.floor(1150 / 8); x++)
      expect(g.hidden[row * g.cols + x]).toBe(0);
  });

  it("stays inside the grid at the map edge", () => {
    const g = newFogGrid(size, true);
    expect(() => paintDisc(g, { x: -50, y: -50 }, 120, false)).not.toThrow();
    expect(() => paintDisc(g, { x: 1300, y: 900 }, 120, false)).not.toThrow();
  });
});

describe("fog boxes and rooms", () => {
  const room = {
    id: "r",
    x: 200,
    y: 200,
    w: 160,
    h: 120,
  } as MapData["rooms"][0];

  it("reveals a box and reports whether anything in it is hidden", () => {
    const g = newFogGrid(size, true);
    const box = { x: 200, y: 200, w: 160, h: 120 };
    expect(anyHidden(g, box)).toBe(true);
    expect(paintBox(g, box, false)).toBe(true);
    expect(anyHidden(g, box)).toBe(false);
    expect(paintBox(g, box, false)).toBe(false);
  });

  it("finds the room under a point, with its wall margin", () => {
    const map = asMap({ rooms: [room] });
    expect(roomAt(map, { x: 250, y: 250 }, 8)).toBe(room);
    expect(roomAt(map, { x: 196, y: 250 }, 8)).toBe(room);
    expect(roomAt(map, { x: 150, y: 250 }, 8)).toBeUndefined();
  });
});

describe("saved fog", () => {
  const good = encodeFog(newFogGrid(size, true));

  it("accepts what the app writes", () => {
    expect(validFog(good, size)).toBe(true);
  });

  it("rejects fog that is damaged or for another map size", () => {
    expect(validFog({ ...good, runs: [...good.runs, 1] }, size)).toBe(false);
    expect(validFog({ ...good, runs: [-1, good.runs[0] + 1] }, size)).toBe(
      false,
    );
    expect(validFog({ ...good, runs: [0.5, good.runs[0] - 0.5] }, size)).toBe(
      false,
    );
    expect(validFog({ ...good, cols: good.cols + 1 }, size)).toBe(false);
    expect(validFog(good, { width: 1600, height: 850 })).toBe(false);
    expect(validFog({ ...good, cell: 0 }, size)).toBe(false);
    expect(validFog(null, size)).toBe(false);
    expect(validFog("hidden", size)).toBe(false);
  });
});

describe("resizing a map with fog", () => {
  it("keeps each cell where it was and hides the added area", () => {
    const g = newFogGrid(size, true);
    paintDisc(g, { x: 80, y: 80 }, 20, false);
    const from = asMap({ fog: encodeFog(g) });
    // The sheet grows by 400 px on the left: everything moves right.
    const to = { width: 1600, height: 850 };
    const fog = shiftFog(from, to, 400, 0)!;
    expect(validFog(fog, to)).toBe(true);
    const grid = decodeFog(fog);
    const at = (x: number, y: number) =>
      grid.hidden[Math.floor(y / 8) * grid.cols + Math.floor(x / 8)];
    expect(at(480, 80)).toBe(0);
    expect(at(100, 80)).toBe(1);
    expect(at(1000, 600)).toBe(1);
  });

  it("makes no fog for a map that had none", () => {
    expect(shiftFog(asMap(), size, 0, 0)).toBeUndefined();
  });
});
