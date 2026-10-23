import { describe, expect, it } from "vitest";
import { Biome } from "./biomes";
import { biomeAt, generateMap } from "./generator";
import { random } from "./random";
import { scatterStroke } from "./scatter";
import { growsOn, picturesFor, poolAtMap } from "./scatter-habitat";
import { kindPictures } from "./scatter-kinds";
import { defaultSettings } from "./types";

const ai = (name: string) => `/assets/ai-gen/${name}.webp`;
const trees = kindPictures("ai-gen", "trees");

describe("growsOn", () => {
  it("keeps trees to their biomes", () => {
    expect(growsOn(ai("tree-oak"), Biome.Forest)).toBe(true);
    expect(growsOn(ai("tree-oak"), Biome.Grassland)).toBe(true);
    expect(growsOn(ai("tree-oak"), Biome.Desert)).toBe(false);
    expect(growsOn(ai("tree-oak"), Biome.Taiga)).toBe(false);
    expect(growsOn(ai("tree-pine"), Biome.Taiga)).toBe(true);
    expect(growsOn(ai("tree-snowy-fir"), Biome.Snow)).toBe(true);
    expect(growsOn(ai("tree-snowy-fir"), Biome.Savanna)).toBe(false);
    expect(growsOn(ai("tree-acacia"), Biome.Savanna)).toBe(true);
    expect(growsOn(ai("tree-autumn"), Biome.AutumnWoods)).toBe(true);
    expect(growsOn(ai("tree-dead"), Biome.Blighted)).toBe(true);
  });
  it("works the same for the Kenney pictures", () => {
    expect(growsOn("/assets/cartography/palm.png", Biome.Jungle)).toBe(true);
    expect(growsOn("/assets/cartography/cactus.png", Biome.Desert)).toBe(true);
    expect(growsOn("/assets/cartography/cactus.png", Biome.Jungle)).toBe(false);
    expect(growsOn("/assets/cartography/treePine.png", Biome.Taiga)).toBe(true);
  });
  it("grows palms and stones on a beach, and no other tree", () => {
    expect(growsOn(ai("tree-palm"), Biome.Beach)).toBe(true);
    expect(growsOn(ai("boulders"), Biome.Beach)).toBe(true);
    expect(growsOn(ai("tree-oak"), Biome.Beach)).toBe(false);
  });
  it("lets mountains and stones stand on any land", () => {
    for (const biome of [
      Biome.Grassland,
      Biome.Desert,
      Biome.Snow,
      Biome.Swamp,
    ]) {
      expect(growsOn(ai("peak-rocky"), biome)).toBe(true);
      expect(growsOn(ai("boulders"), biome)).toBe(true);
    }
  });
  it("lets a picture no style scatters stand on any land", () => {
    expect(growsOn("/assets/cartography/castle.png", Biome.Forest)).toBe(true);
    expect(growsOn("/assets/cartography/castle.png", Biome.Desert)).toBe(true);
    expect(growsOn("data:image/png;base64,AAAA", Biome.Forest)).toBe(true);
  });
  it("grows nothing on water", () => {
    for (const src of [ai("tree-palm"), ai("boulders"), ai("peak-rocky")]) {
      expect(growsOn(src, Biome.Sea)).toBe(false);
      expect(growsOn(src, Biome.CoralReef)).toBe(false);
    }
  });
});

describe("picturesFor", () => {
  it("narrows a pool of trees to a biome's", () => {
    const names = picturesFor(trees, Biome.Taiga).map((p) => p.sprite.src);
    expect(names).toContain(ai("tree-pine"));
    expect(names).not.toContain(ai("tree-oak"));
    expect(names).not.toContain(ai("tree-palm"));
  });
  it("leaves every kind of tree something to grow somewhere", () => {
    const all = new Set<string>();
    for (const biome of Object.values(Biome))
      for (const p of picturesFor(trees, biome)) all.add(p.sprite.src);
    // Only the pictures no pool uses may be left out.
    const unused = trees.filter((p) => !all.has(p.sprite.src));
    expect(unused.map((p) => p.sprite.src)).toEqual([]);
  });
});

describe("poolAtMap", () => {
  const map = generateMap("world", defaultSettings);
  const find = (want: (biome: number) => boolean) => {
    for (let y = 0; y < map.rows; y++)
      for (let x = 0; x < map.cols; x++)
        if (want(biomeAt(map, x, y)))
          return {
            x: ((x + 0.5) / map.cols) * map.width,
            y: ((y + 0.5) / map.rows) * map.height,
          };
    throw new Error("no such ground on the map");
  };
  it("gives nothing over the sea", () => {
    const sea = find((b) => b === Biome.Sea);
    expect(poolAtMap(map, trees)(sea)).toEqual([]);
  });
  it("gives the trees of the biome over land", () => {
    const wood = find((b) => b === Biome.Forest || b === Biome.Grassland);
    expect(poolAtMap(map, trees)(wood).length).toBeGreaterThan(0);
  });
  it("keeps stamps off the sea in a stroke", () => {
    const options = {
      radius: 120,
      size: 40,
      density: 2,
      scale: [1, 1] as const,
      flip: false,
      turn: 0,
      tint: 0,
    };
    const poolAt = poolAtMap(map, trees),
      rand = random("sea");
    let placed = 0;
    for (let i = 0; i < 40; i++) {
      const at = {
        x: map.width * (0.1 + 0.8 * rand()),
        y: map.height * (0.1 + 0.8 * rand()),
      };
      for (const p of scatterStroke(
        undefined,
        at,
        trees,
        options,
        rand,
        poolAt,
      )) {
        placed++;
        expect(poolAt(p).length).toBeGreaterThan(0);
        const gx = Math.floor((p.x / map.width) * map.cols),
          gy = Math.floor((p.y / map.height) * map.rows);
        expect(biomeAt(map, gx, gy)).not.toBe(Biome.Sea);
      }
    }
    expect(placed).toBeGreaterThan(50);
  });
});
