import { describe, expect, it } from "vitest";
import { createEmptyMap } from "./generator";
import { buildGround, groundTarget, skirt, skirtWidth } from "./ground-paint";
import { defaultSettings } from "./types";
import type { MapData } from "./types";

const CELL = 5;
const world = (cols = 120, rows = 90, height?: number) => {
  const m = createEmptyMap("world", { ...defaultSettings }, "t", "t", {
    cols,
    rows,
  });
  m.heights.fill(height ?? m.settings.seaLevel - 0.15);
  return m;
};
const brush = (material: string, size = 200, hardness = 85) => ({
  size,
  strength: 55,
  biome: 6,
  material,
  hardness,
});

/** Height at a point in cell units, interpolated between cells as the renderer does. */
function heightAt(m: MapData, x: number, y: number) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    fx = x - ix,
    fy = y - iy,
    c = m.cols,
    h = m.heights;
  return (
    h[iy * c + ix] * (1 - fx) * (1 - fy) +
    h[iy * c + ix + 1] * fx * (1 - fy) +
    h[(iy + 1) * c + ix] * (1 - fx) * fy +
    h[(iy + 1) * c + ix + 1] * fx * fy
  );
}

/** How far out the shore lies along each of 360 rays, where the land (or, for `water`, the sea) ends. */
function shoreRadii(
  m: MapData,
  cx: number,
  cy: number,
  rMax: number,
  inside: (h: number) => boolean,
) {
  return Array.from({ length: 360 }, (_, k) => {
    const a = (k / 360) * Math.PI * 2;
    let last = 0;
    for (let r = 0; r <= rMax; r += 0.02)
      if (inside(heightAt(m, cx + Math.cos(a) * r, cy + Math.sin(a) * r)))
        last = r;
    return last;
  });
}
const spreadOf = (xs: number[]) => {
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return {
    sd: Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length),
    range: Math.max(...xs) - Math.min(...xs),
  };
};

describe("ground painting edge", () => {
  // A dab centred off the cell grid, as a real drag is.
  const cx = 60.3,
    cy = 45.7;

  it("draws the shore of a painted disc along its circle, not along the cell grid", () => {
    for (const hardness of [100, 85, 0]) {
      const m = world();
      buildGround(
        m,
        { x: cx * CELL, y: cy * CELL },
        brush("sand", 200, hardness),
      );
      const { sd, range } = spreadOf(
        shoreRadii(m, cx, cy, 30, (h) => h >= m.settings.seaLevel),
      );
      // Cell-by-cell discs wandered 0.9 of a cell (sd 0.24) either side of the circle.
      expect(sd, `hardness ${hardness}`).toBeLessThan(0.15);
      expect(range, `hardness ${hardness}`).toBeLessThan(0.55);
    }
  });

  it("does the same for a basin of water dug into land", () => {
    const m = world(120, 90, 0.7);
    buildGround(
      m,
      { x: cx * CELL, y: cy * CELL },
      brush("shallow-water", 200, 85),
    );
    const { sd, range } = spreadOf(
      shoreRadii(m, cx, cy, 30, (h) => h < m.settings.seaLevel),
    );
    expect(sd).toBeLessThan(0.15);
    expect(range).toBeLessThan(0.55);
  });

  it("keeps the shore of a dragged stroke smooth however many dabs it takes", () => {
    const m = world(160, 90);
    for (let k = 0; k <= 60; k++)
      buildGround(
        m,
        { x: (30.3 + k * 1.1) * CELL, y: cy * CELL },
        brush("sand", 120, 85),
      );
    const tops: number[] = [];
    for (let x = 45; x <= 80; x += 0.37) {
      let top = 0;
      for (let y = cy; y > 10; y -= 0.02)
        if (heightAt(m, x, y) >= m.settings.seaLevel) top = cy - y;
      tops.push(top);
    }
    expect(spreadOf(tops).sd).toBeLessThan(0.05);
  });

  it("changes nothing when the same dab is repeated", () => {
    const once = world(),
      many = world();
    buildGround(once, { x: 301.5, y: 228.5 }, brush("sand"));
    for (let k = 0; k < 20; k++)
      buildGround(many, { x: 301.5, y: 228.5 }, brush("sand"));
    for (let i = 0; i < once.heights.length; i++)
      expect(many.heights[i]).toBeCloseTo(once.heights[i], 6);
  });

  it("lets Edge hardness decide how far the edge slopes", () => {
    const slopeCells = (hardness: number) => {
      const m = world(),
        target = groundTarget("sand", m.settings.seaLevel).height,
        low = m.settings.seaLevel - 0.15;
      buildGround(
        m,
        { x: cx * CELL, y: cy * CELL },
        brush("sand", 200, hardness),
      );
      // Cells that are neither untouched sea nor finished ground are the slope.
      return [...m.heights].filter((h) => h > low + 1e-6 && h < target - 1e-6)
        .length;
    };
    expect(slopeCells(0)).toBeGreaterThan(slopeCells(100) * 3);
    expect(skirtWidth(20, 0)).toBeGreaterThan(skirtWidth(20, 100));
    expect(skirtWidth(20, 100)).toBe(1);
  });

  it("still brings everything under the brush to the ground's own height and biome", () => {
    const m = world(),
      g = groundTarget("dirt", m.settings.seaLevel);
    buildGround(m, { x: 300, y: 225 }, brush("dirt", 200, 85));
    const centre = Math.round(45) * m.cols + 60;
    expect(m.heights[centre]).toBeCloseTo(g.height, 6);
    expect(m.terrain?.biomes[centre] ?? m.biomes[centre]).toBe(g.biome);
  });

  it("leaves cells beyond the brush and its slope alone", () => {
    const m = world(120, 90, 0.9);
    buildGround(m, { x: 300, y: 225 }, brush("shallow-water", 100, 0));
    // The corner is far outside a 10-cell brush and its slope.
    expect(m.heights[2 * m.cols + 2]).toBeCloseTo(0.9, 6);
    expect(m.heights[(m.rows - 3) * m.cols + (m.cols - 3)]).toBeCloseTo(0.9, 6);
  });

  it("ramps from 0 at the rim to 1 across the slope, and is smooth", () => {
    expect(skirt(0, 10, 2)).toBe(0);
    expect(skirt(9.5, 10, 2)).toBe(0);
    expect(skirt(11.5, 10, 2)).toBe(1);
    let last = 0;
    for (let d = 9.5; d <= 11.5; d += 0.05) {
      const s = skirt(d, 10, 2);
      expect(s).toBeGreaterThanOrEqual(last);
      last = s;
    }
  });
});
