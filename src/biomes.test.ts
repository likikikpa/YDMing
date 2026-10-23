import { describe, expect, it } from "vitest";
import { BIOME_NAMES, Biome, FIRST_PAINTED_ONLY, MAX_BIOME } from "./biomes";
import { generateMap, BIOMES } from "./generator";
import { ru } from "./i18n";
import {
  fantasyPalette,
  inkPalette,
  realisticPalette,
  SHALLOW_WATER_COLOUR,
} from "./style-palettes";
import { validateProject } from "./storage";
import { defaultSettings } from "./types";

describe("biome ids", () => {
  it("keep the meaning they had in saved maps", () => {
    expect(BIOME_NAMES.slice(0, 14)).toEqual([
      "Auto",
      "Snow",
      "Rock",
      "Tundra",
      "Taiga",
      "Grassland",
      "Forest",
      "Swamp",
      "Desert",
      "Savanna",
      "Jungle",
      "Beach",
      "Sea",
      "Dirt",
    ]);
  });

  it("are named once each, and the named ids point at their names", () => {
    expect(new Set(BIOME_NAMES).size).toBe(BIOME_NAMES.length);
    expect(MAX_BIOME).toBe(BIOME_NAMES.length - 1);
    expect(BIOMES).toBe(BIOME_NAMES);
    expect(BIOME_NAMES[Biome.Sea]).toBe("Sea");
    expect(BIOME_NAMES[Biome.Volcanic]).toBe("Volcanic");
    expect(BIOME_NAMES[Biome.CoralReef]).toBe("Coral reef");
    expect(new Set(Object.values(Biome)).size).toBe(MAX_BIOME);
  });

  it("start the hand-painted ones right after the last the generator places", () => {
    expect(BIOME_NAMES[FIRST_PAINTED_ONLY - 1]).toBe("Dirt");
    expect(BIOME_NAMES[FIRST_PAINTED_ONLY]).toBe("Badlands");
  });

  it("have a Russian name", () => {
    for (const name of BIOME_NAMES) expect(ru[name], name).toBeTruthy();
  });
});

describe("palettes", () => {
  it("hold a colour for every biome and then shallow water, in every style", () => {
    for (const palette of [fantasyPalette, inkPalette, realisticPalette]) {
      expect(palette).toHaveLength(BIOME_NAMES.length + 1);
      for (const rgb of palette) {
        expect(rgb).toHaveLength(3);
        for (const c of rgb) expect(c >= 0 && c <= 255).toBe(true);
      }
    }
    expect(SHALLOW_WATER_COLOUR).toBe(BIOME_NAMES.length);
  });
});

describe("saved maps with the new biomes", () => {
  const project = (biome: number) => {
    const map = generateMap("world", { ...defaultSettings, seed: "BIOME" }),
      cells = map.cols * map.rows;
    map.terrain = {
      heights: Array.from(map.heights),
      biomes: new Array(cells).fill(biome),
    };
    return {
      version: 1,
      id: "p",
      name: "P",
      maps: [map],
      activeMapId: map.id,
      credits: [],
      commercial: false,
      updatedAt: "",
    };
  };

  it("load with every biome id up to the last", () => {
    for (const biome of [0, 13, 14, MAX_BIOME])
      expect(() => validateProject(project(biome))).not.toThrow();
  });

  it("are rejected for an id that does not exist", () => {
    for (const biome of [MAX_BIOME + 1, -1, 2.5])
      expect(() => validateProject(project(biome))).toThrow("landscape");
  });
});
