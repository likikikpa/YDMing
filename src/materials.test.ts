import { describe, expect, it } from "vitest";
import { createEmptyMap } from "./generator";
import {
  biomeMaterial,
  defaultTextures,
  isBuiltinMaterial,
  newTextureLayer,
  paintedCellCount,
  paintedMaterial,
  PATTERNS,
  patternTile,
  replaceMaterial,
  setMaterial,
  TILE,
} from "./materials";
import { sculptDab } from "./sculpt";
import { validateProject } from "./storage";
import { defaultSettings } from "./types";

const world = () => {
  const map = createEmptyMap("world", { ...defaultSettings, seed: "MAT" });
  map.heights.fill(0.5);
  return map;
};

describe("ground materials", () => {
  it("maps every green biome to the one grass", () => {
    for (const b of [4, 5, 6, 7, 9, 10]) expect(biomeMaterial(b)).toBe("grass");
    expect(biomeMaterial(1)).toBe("snow");
    expect(biomeMaterial(8)).toBe("sand");
    expect(biomeMaterial(13)).toBe("dirt");
  });
  it("paints, reads and clears a cell", () => {
    const map = world();
    setMaterial(map, map, 10, "sand");
    setMaterial(map, map, 11, "rock");
    expect(paintedMaterial(map, map, 10)).toBe("sand");
    expect(paintedMaterial(map, map, 11)).toBe("rock");
    expect(paintedMaterial(map, map, 12)).toBeUndefined();
    setMaterial(map, map, 10, null);
    expect(paintedMaterial(map, map, 10)).toBeUndefined();
  });
  it("hands painted cells to another material when a layer is deleted", () => {
    const map = world();
    setMaterial(map, map, 1, "mud");
    setMaterial(map, map, 2, "sand");
    replaceMaterial(map, "mud", "sand");
    expect(paintedMaterial(map, map, 1)).toBe("sand");
    setMaterial(map, map, 3, "cobble");
    replaceMaterial(map, "cobble", null);
    expect(paintedMaterial(map, map, 3)).toBeUndefined();
  });
  it("counts painted cells and tells built-ins from custom layers", () => {
    const map = world();
    setMaterial(map, map, 1, "mud");
    setMaterial(map, map, 2, "mud");
    setMaterial(map, map, 3, "sand");
    expect(paintedCellCount([map], "mud")).toBe(2);
    expect(paintedCellCount([map], "cobble")).toBe(0);
    expect(isBuiltinMaterial("grass")).toBe(true);
    expect(isBuiltinMaterial("mud")).toBe(false);
  });
  it("names new layers after the custom ones already present", () => {
    const list = defaultTextures();
    expect(newTextureLayer("a", list, "Texture").name).toBe("Texture 1");
    list.push(newTextureLayer("a", list, "Texture"));
    expect(newTextureLayer("b", list, "Texture").name).toBe("Texture 2");
  });
  it("terrain paint with a custom texture raises grass-height land and paints it on", () => {
    const map = world();
    sculptDab(map, "terrain", { x: 600, y: 425 }, 0.5, 0, {
      size: 40,
      strength: 50,
      biome: 0,
      material: "mud",
      hardness: 100,
    });
    const centre = 85 * map.cols + 120;
    expect(paintedMaterial(map, map, centre)).toBe("mud");
    expect(paintedMaterial(map, map, 10 * map.cols + 10)).toBeUndefined();
    expect(map.heights[10 * map.cols + 10]).toBe(0.5);
  });
  it("generates tiles that wrap without a seam", () => {
    for (const pattern of PATTERNS) {
      const [tile] = patternTile(pattern),
        step = (a: number, b: number) => Math.abs(tile[a] - tile[b]);
      let seam = 0,
        inner = 0;
      for (let y = 0; y < TILE; y++) {
        seam += step(y * TILE + TILE - 1, y * TILE);
        inner += step(y * TILE + 63, y * TILE + 64);
      }
      // Crossing the tile edge is no rougher than crossing its middle.
      expect(seam).toBeLessThan(inner * 2 + 1);
    }
  });
  it("keeps texture layers through save and load", () => {
    const map = world();
    setMaterial(map, map, 5, "sand");
    const project = {
      version: 1 as const,
      id: "p",
      name: "P",
      maps: [map],
      activeMapId: map.id,
      credits: [],
      textures: defaultTextures(),
      commercial: false,
      updatedAt: "",
    };
    expect(
      validateProject(JSON.parse(JSON.stringify(project))).textures,
    ).toHaveLength(7);
    expect(() =>
      validateProject({ ...project, textures: [{ id: "x" }] }),
    ).toThrow();
  });
});
