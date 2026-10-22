import { describe, expect, it } from "vitest";
import {
  ANY_TURN,
  coherence,
  HALF_TURNS,
  hexBlend,
  turnsFor,
} from "./hex-tiling";
import { PATTERNS, patternTile, TILE } from "./materials";
import type { Tile } from "./hex-tiling";

const SIZE = 32;

/** A grey tile from a function of the texel, as RGB. */
function tileOf(f: (x: number, y: number) => number) {
  const rgb = new Float32Array(SIZE * SIZE * 3);
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++)
      rgb.fill(f(x, y), (y * SIZE + x) * 3, (y * SIZE + x) * 3 + 3);
  return rgb;
}
/** Independent random texels from a small seeded generator. */
function randomTile() {
  let seed = 12345;
  return tileOf(() => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return (seed >>> 8) % 256;
  });
}
const stripes = tileOf((_, y) => (y % 8 < 4 ? 200 : 50)),
  noise = randomTile();
const mean = [125, 125, 125];

/** The pattern's tile as RGB, the way a material holds it. */
function patternRgb(pattern: (typeof PATTERNS)[number]) {
  const base = patternTile(pattern)[0],
    rgb = new Float32Array(base.length * 3);
  for (let i = 0; i < base.length; i++)
    rgb.fill(128 + base[i] * 40, i * 3, i * 3 + 3);
  return rgb;
}

describe("how directional a tile is", () => {
  it("is 1 for parallel stripes in either direction, and about 0 for noise or a flat tile", () => {
    expect(coherence(stripes, SIZE)).toBeGreaterThan(0.95);
    expect(
      coherence(
        tileOf((x) => (x % 8 < 4 ? 200 : 50)),
        SIZE,
      ),
    ).toBeGreaterThan(0.95);
    expect(coherence(noise, SIZE)).toBeLessThan(0.1);
    expect(
      coherence(
        tileOf(() => 90),
        SIZE,
      ),
    ).toBe(0);
  });

  it("ignores a tile that is not a square of RGB texels", () => {
    expect(coherence(new Float32Array(10), 4)).toBe(0);
  });

  it("marks the water pattern, and no other built-in one, as directional", () => {
    for (const pattern of PATTERNS)
      expect([pattern, turnsFor(patternRgb(pattern), TILE)]).toEqual([
        pattern,
        pattern === "water" ? HALF_TURNS : ANY_TURN,
      ]);
  });
});

describe("blending turned copies of a directional tile", () => {
  /** Mean change per step along each direction over a stretch of ground. */
  function change(turns: number) {
    const t: Tile = { rgb: stripes, size: SIZE, k: 1, turns },
      n = 240,
      grid: number[][] = [],
      out = [0, 0, 0];
    for (let j = 0; j < n; j++) {
      grid.push([]);
      for (let i = 0; i < n; i++) {
        hexBlend(t, mean, i / (SIZE * 2), j / (SIZE * 2), out);
        grid[j].push(out[0]);
      }
    }
    let across = 0,
      along = 0;
    for (let j = 1; j < n; j++)
      for (let i = 1; i < n; i++) {
        across += Math.abs(grid[j][i] - grid[j][i - 1]);
        along += Math.abs(grid[j][i] - grid[j - 1][i]);
      }
    return { across, along };
  }

  it("keeps stripes running the same way across every patch when only half turns are allowed", () => {
    const { across, along } = change(HALF_TURNS);
    expect(across / along).toBeLessThan(0.15);
  });

  it("lays them sideways in some patches when quarter turns are allowed", () => {
    const { across, along } = change(ANY_TURN);
    expect(across / along).toBeGreaterThan(0.4);
  });
});
