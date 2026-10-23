import { describe, expect, it } from "vitest";
import { BIOME_GROUNDS } from "./biome-grounds";
import { Biome, MAX_BIOME } from "./biomes";
import { defaultTextures } from "./materials";
import { biomeGround, buildMaterial, densityOf } from "./terrain-material";
import type { TextureLayer } from "./types";

const layer = (id: string): TextureLayer =>
  defaultTextures().find((l) => l.id === id)!;

const ground = (style: string, biome: number) => {
  const recipe = BIOME_GROUNDS[biome]!;
  return biomeGround(style, biome, layer(recipe.base));
};

const distance = (a: number[], b: number[]) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

describe("a biome's own ground", () => {
  it("exists for the biomes with a recipe and for no other", () => {
    for (let b = 0; b <= MAX_BIOME; b++) {
      const made = biomeGround("fantasy", b, layer("grass"));
      if (BIOME_GROUNDS[b] && BIOME_GROUNDS[b]!.base === "grass")
        expect(made, String(b)).toBeDefined();
      if (!BIOME_GROUNDS[b]) expect(made, String(b)).toBeUndefined();
    }
    // Snow, rock, grassland, beach, dirt and the sea use the built-in layers.
    for (const b of [1, 2, 5, 11, 12, 13])
      expect(BIOME_GROUNDS[b], String(b)).toBeUndefined();
  });

  it("gives each green biome a colour of its own in Painted fantasy", () => {
    const greens = [
      buildMaterial(layer("grass"), "fantasy"),
      ground("fantasy", Biome.Forest)!,
      ground("fantasy", Biome.Taiga)!,
      ground("fantasy", Biome.Swamp)!,
      ground("fantasy", Biome.Savanna)!,
      ground("fantasy", Biome.Jungle)!,
    ].map((m) => m.mean);
    for (let i = 0; i < greens.length; i++)
      for (let j = i + 1; j < greens.length; j++)
        expect(distance(greens[i], greens[j]), `${i} ${j}`).toBeGreaterThan(8);
  });

  it("is shaped by the built-in layer it is based on", () => {
    const grass = { ...layer("grass"), scale: 250, strength: 20 };
    const made = biomeGround("fantasy", Biome.Taiga, grass)!;
    expect(made.density).toBe(densityOf(grass));
    expect(made.detail).toBeCloseTo(0.2);
  });

  it("gives way to a picture, a tint or a switched-off layer that the map-maker set", () => {
    const grass = layer("grass");
    for (const custom of [
      { ...grass, image: "data:image/png;base64,AA==" },
      { ...grass, tint: "#336699" },
      { ...grass, visible: false },
    ])
      expect(biomeGround("fantasy", Biome.Taiga, custom)).toBeUndefined();
    expect(biomeGround("fantasy", Biome.Taiga, undefined)).toBeUndefined();
  });

  it("is the same material in every map, and drawn in the style's own colours", () => {
    const fantasy = ground("fantasy", Biome.Badlands)!,
      ink = ground("ink", Biome.Badlands)!;
    expect(distance(fantasy.mean, ink.mean)).toBeGreaterThan(30);
    // Painted fantasy's badlands are red; Old ink's are a warm paper.
    expect(fantasy.mean[0]).toBeGreaterThan(fantasy.mean[2] * 1.8);
    expect(ink.mean[0]).toBeLessThan(255);
  });
});

describe("lava", () => {
  const texels = (m: { levels: Float32Array[] }) => {
    const level = m.levels[0],
      out: number[][] = [];
    for (let i = 0; i < level.length; i += 3)
      out.push([level[i], level[i + 1], level[i + 2]]);
    return out;
  };

  it("glows orange in its cracks over a dark crust in Painted fantasy", () => {
    const all = texels(ground("fantasy", Biome.Volcanic)!),
      molten = all.filter((c) => c[0] > 220 && c[1] > 100 && c[2] < 90),
      crust = all.filter((c) => c[0] < 120);
    expect(molten.length / all.length).toBeGreaterThan(0.03);
    expect(molten.length / all.length).toBeLessThan(0.45);
    expect(crust.length / all.length).toBeGreaterThan(0.4);
  });

  it("is drawn as dark ink cracks on a paler crust in Old ink", () => {
    const all = texels(ground("ink", Biome.Volcanic)!),
      cracks = all.filter((c) => c[0] < 120),
      crust = all.filter((c) => c[0] > 150);
    expect(cracks.length / all.length).toBeGreaterThan(0.03);
    expect(crust.length / all.length).toBeGreaterThan(0.4);
  });

  it("does not glow when the layer it is based on is switched off", () => {
    const flat = biomeGround("fantasy", Biome.Volcanic, {
      ...layer("rock"),
      visible: false,
    });
    expect(flat).toBeUndefined();
  });
});
