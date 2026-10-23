import { describe, expect, it } from "vitest";
import { Biome } from "./biomes";
import { biomeAt, generateMap } from "./generator";
import { random } from "./random";
import { scatterStroke } from "./scatter";
import {
  LAND_BIOMES,
  defaultBiomes,
  growsOn,
  pictureGrowsOn,
  picturesFor,
  poolAtMap,
} from "./scatter-habitat";
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
  it("lets stones stand on any land", () => {
    for (const biome of [
      Biome.Grassland,
      Biome.Desert,
      Biome.Snow,
      Biome.Swamp,
    ])
      expect(growsOn(ai("boulders"), biome)).toBe(true);
  });
  it("keeps mountains to their biomes", () => {
    expect(growsOn(ai("peak-snow"), Biome.Snow)).toBe(true);
    expect(growsOn(ai("peak-snow"), Biome.Rock)).toBe(true);
    expect(growsOn(ai("peak-snow"), Biome.Savanna)).toBe(false);
    expect(growsOn(ai("peak-snow"), Biome.Desert)).toBe(false);
    expect(growsOn(ai("range-snow"), Biome.Glacier)).toBe(true);
    expect(growsOn(ai("range-snow"), Biome.Grassland)).toBe(false);
    expect(growsOn(ai("peak-rocky"), Biome.Grassland)).toBe(true);
    expect(growsOn(ai("peak-rocky"), Biome.Forest)).toBe(true);
    expect(growsOn(ai("peak-rocky"), Biome.Desert)).toBe(false);
    expect(growsOn(ai("range-desert"), Biome.Desert)).toBe(true);
    expect(growsOn(ai("range-desert"), Biome.Forest)).toBe(false);
    expect(growsOn(ai("mesa"), Biome.Badlands)).toBe(true);
    expect(growsOn(ai("mesa"), Biome.Snow)).toBe(false);
    expect(growsOn(ai("volcano"), Biome.Volcanic)).toBe(true);
    expect(growsOn(ai("volcano"), Biome.Rock)).toBe(true);
    expect(growsOn(ai("volcano"), Biome.Beach)).toBe(false);
    expect(growsOn(ai("hills"), Biome.Moorland)).toBe(true);
    expect(growsOn(ai("hills"), Biome.Desert)).toBe(false);
    expect(
      growsOn("/assets/cartography/rocksMountain.png", Biome.Grassland),
    ).toBe(true);
  });
  it("keeps snowy trees to the cold", () => {
    expect(growsOn(ai("tree-snowy-fir"), Biome.Taiga)).toBe(true);
    expect(growsOn(ai("tree-snowy-fir"), Biome.Jungle)).toBe(false);
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

describe("mountains by biome", () => {
  const mountains = kindPictures("ai-gen", "mountains");
  const names = (biome: number) =>
    picturesFor(mountains, biome).map((p) => p.sprite.src.split("/").pop());
  it("gives snow its snowy peaks and the desert its ranges", () => {
    expect(names(Biome.Snow)).toContain("peak-snow.webp");
    expect(names(Biome.Snow)).not.toContain("range-desert.webp");
    expect(names(Biome.Desert)).toContain("range-desert.webp");
    expect(names(Biome.Desert)).not.toContain("peak-snow.webp");
  });
  it("gives grassland rocky peaks and ridges but no snow", () => {
    expect(names(Biome.Grassland)).toEqual(
      expect.arrayContaining(["peak-rocky.webp", "ridge.webp"]),
    );
    expect(names(Biome.Grassland)).not.toContain("peak-snow.webp");
  });
  it("gives the sea nothing", () => {
    expect(names(Biome.Sea)).toEqual([]);
  });
});

describe("pictures with their own biomes", () => {
  const oak = { sprite: { src: ai("tree-oak"), name: "Oak" } };
  it("grow only where chosen, whatever the rules say", () => {
    const chosen = { ...oak, biomes: [Biome.Desert, Biome.Snow] };
    expect(pictureGrowsOn(chosen, Biome.Desert)).toBe(true);
    expect(pictureGrowsOn(chosen, Biome.Snow)).toBe(true);
    expect(pictureGrowsOn(chosen, Biome.Forest)).toBe(false);
    expect(pictureGrowsOn(oak, Biome.Forest)).toBe(true);
    expect(pictureGrowsOn(oak, Biome.Desert)).toBe(false);
  });
  it("never grow on water, even when listed", () => {
    const chosen = { ...oak, biomes: [Biome.Sea, Biome.CoralReef] };
    expect(pictureGrowsOn(chosen, Biome.Sea)).toBe(false);
    expect(pictureGrowsOn(chosen, Biome.CoralReef)).toBe(false);
  });
  it("narrow a pool per biome", () => {
    const pool = [
      { ...oak, biomes: [Biome.Desert] },
      { sprite: { src: ai("tree-pine"), name: "Pine" } },
    ];
    expect(picturesFor(pool, Biome.Desert)).toHaveLength(1);
    expect(picturesFor(pool, Biome.Taiga)).toHaveLength(1);
    expect(picturesFor(pool, Biome.Taiga)[0].sprite.name).toBe("Pine");
  });
});

describe("the biome lists", () => {
  it("leave out Auto, the sea and the reef", () => {
    expect(LAND_BIOMES).not.toContain(0);
    expect(LAND_BIOMES).not.toContain(Biome.Sea);
    expect(LAND_BIOMES).not.toContain(Biome.CoralReef);
    expect(LAND_BIOMES).toContain(Biome.Mangrove);
  });
  it("show where a picture grows by default", () => {
    expect(defaultBiomes(ai("tree-oak"))).toEqual(
      expect.arrayContaining([Biome.Forest, Biome.Grassland]),
    );
    expect(defaultBiomes(ai("tree-oak"))).not.toContain(Biome.Desert);
    expect(defaultBiomes(ai("boulders"))).toHaveLength(LAND_BIOMES.length);
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
