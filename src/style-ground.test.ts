import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BIOME_KEYS } from "./biomes";
import { BUILTIN_MATERIALS } from "./materials";
import {
  groundKinds,
  groundPhoto,
  groundSources,
  recoloured,
} from "./style-ground";

/** A tile of `texels` RGB texels, each channel from `f`. */
const tile = (texels: number, f: (i: number, k: number) => number) => {
  const rgb = new Float32Array(texels * 3);
  for (let i = 0; i < texels; i++)
    for (let k = 0; k < 3; k++) rgb[i * 3 + k] = f(i, k);
  return rgb;
};

const mean = (rgb: Float32Array) => {
  const out = [0, 0, 0];
  for (let i = 0; i < rgb.length; i++) out[i % 3] += (rgb[i] * 3) / rgb.length;
  return out;
};

describe("photo ground", () => {
  it("is listed for Realistic only, and maps saved as retired styles have none", () => {
    expect(groundSources("realistic")).toHaveLength(
      groundKinds("realistic").length,
    );
    expect(groundKinds("realistic").length).toBeGreaterThan(6);
    for (const style of ["fantasy", "ink", "painted", "atlas", "nonsense"])
      expect(groundSources(style)).toEqual([]);
  });

  it("names only tiles that ship with the app", () => {
    for (const src of groundSources("realistic"))
      expect(existsSync(join("public", src)), src).toBe(true);
  });

  it("is not there until the tiles have loaded", () => {
    expect(groundPhoto("realistic", "grass")).toBeUndefined();
    expect(groundPhoto("fantasy", "grass")).toBeUndefined();
  });
});

describe("recolouring a photo tile", () => {
  // A brownish tile with plenty of light and shade.
  const brown = tile(64, (i, k) =>
    Math.round([150, 110, 60][k] * (0.6 + (0.8 * ((i * 37) % 64)) / 63)),
  );

  it("gives the tile the average colour asked for, whatever it was", () => {
    const [out] = recoloured([brown], [60, 110, 50], 0.2);
    const [r, g, b] = mean(out);
    expect(r).toBeCloseTo(60, -1);
    expect(g).toBeCloseTo(110, -1);
    expect(b).toBeCloseTo(50, -1);
  });

  it("keeps the tile's light and shade: brighter texels stay brighter", () => {
    const [out] = recoloured([brown], [60, 110, 50], 0.2);
    const light = (rgb: Float32Array, i: number) =>
      rgb[i * 3] * 0.3 + rgb[i * 3 + 1] * 0.59 + rgb[i * 3 + 2] * 0.11;
    const dark = Array.from({ length: 64 }, (_, i) => i).sort(
      (a, b) => light(brown, a) - light(brown, b),
    );
    expect(light(out, dark[63])).toBeGreaterThan(light(out, dark[0]) * 1.5);
  });

  it("turns brown to green, not teal", () => {
    const [out] = recoloured([brown], [60, 110, 50], 0.2);
    // Green leads and red is above blue, as in the colour asked for.
    for (let i = 0; i < 64; i++) {
      expect(out[i * 3 + 1]).toBeGreaterThan(out[i * 3]);
      expect(out[i * 3]).toBeGreaterThanOrEqual(out[i * 3 + 2] * 0.9);
    }
  });

  it("keeps every level within 0 to 255, and the same length", () => {
    const levels = [brown, tile(16, () => 250), tile(4, () => 3)];
    const out = recoloured(levels, [240, 240, 240], 0.5);
    expect(out.map((l) => l.length)).toEqual(levels.map((l) => l.length));
    for (const level of out)
      for (const v of level) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(255);
      }
  });

  it("copes with a black tile", () => {
    const [out] = recoloured([tile(16, () => 0)], [100, 100, 100], 0.5);
    for (const v of out) expect(Number.isFinite(v)).toBe(true);
  });
});

describe("the grounds a photo style covers", () => {
  it("include every land material, and the rest are biomes", () => {
    const land = BUILTIN_MATERIALS.filter((id) => !id.endsWith("water")),
      biomes = Object.values(BIOME_KEYS),
      kinds = groundKinds("realistic");
    for (const id of land) expect(kinds).toContain(id);
    for (const kind of kinds)
      expect([...land, ...biomes], kind).toContain(kind);
  });
});
