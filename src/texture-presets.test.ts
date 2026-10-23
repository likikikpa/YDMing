import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createEmptyMap } from "./generator";
import { ru } from "./i18n";
import { defaultTextures, PATTERNS } from "./materials";
import { validateProject } from "./storage";
import {
  TEXTURE_PRESETS,
  madeFrom,
  presetLayer,
  unusedPresets,
} from "./texture-presets";
import { defaultSettings } from "./types";

describe("photo texture presets", () => {
  it("has a picture on disk for each preset, under a unique id", () => {
    const ids = new Set<string>();
    for (const p of TEXTURE_PRESETS) {
      expect(ids.has(p.id), p.id).toBe(false);
      ids.add(p.id);
      expect(existsSync(`public${p.src}`), p.src).toBe(true);
      expect(p.source).toMatch(/^https:\/\/polyhaven\.com\/a\//);
    }
    expect(TEXTURE_PRESETS.length).toBeGreaterThanOrEqual(10);
  });

  it("stores tiles small enough to embed in every project that uses them", () => {
    for (const p of TEXTURE_PRESETS)
      expect(readFileSync(`public${p.src}`).length, p.src).toBeLessThan(40_000);
  });

  it("states the licence next to the pictures", () => {
    expect(readFileSync("public/assets/textures/License.txt", "utf8")).toMatch(
      /CC0/,
    );
  });

  it("makes a layer with a known pattern that uses the picture", () => {
    for (const p of TEXTURE_PRESETS) {
      const layer = presetLayer("x", p, "data:image/jpeg;base64,AA==");
      expect(PATTERNS).toContain(layer.pattern);
      expect(layer).toMatchObject({
        id: "x",
        name: p.name,
        image: "data:image/jpeg;base64,AA==",
        visible: true,
      });
    }
  });
});

describe("photo textures in the terrain paint tool", () => {
  const image = "data:image/jpeg;base64,AA==";
  const [first, second] = TEXTURE_PRESETS;

  it("offers every photo when the project has none", () => {
    expect(unusedPresets(defaultTextures())).toEqual(TEXTURE_PRESETS);
  });

  it("stops offering a photo once it is a layer, even if it was renamed", () => {
    const layers = [...defaultTextures(), presetLayer("a", first, image)];
    layers[layers.length - 1].name = "My ground";
    expect(unusedPresets(layers).map((p) => p.id)).not.toContain(first.id);
    expect(unusedPresets(layers)).toHaveLength(TEXTURE_PRESETS.length - 1);
  });

  it("recognises a layer saved before presets were recorded by its name", () => {
    const old = { ...presetLayer("a", second, image), preset: undefined };
    expect(madeFrom(old, second)).toBe(true);
    expect(madeFrom(old, first)).toBe(false);
    expect(madeFrom({ ...old, image: undefined }, second)).toBe(false);
  });

  it("offers a photo again after its layer is deleted", () => {
    const layers = [...defaultTextures(), presetLayer("a", first, image)];
    expect(unusedPresets(layers.slice(0, -1))).toContainEqual(first);
  });

  it("keeps which photo a layer came from through saving and loading", () => {
    const map = createEmptyMap("world", defaultSettings);
    const project = {
      version: 1 as const,
      id: "p",
      name: "P",
      maps: [map],
      activeMapId: map.id,
      credits: [],
      textures: [...defaultTextures(), presetLayer("a", first, image)],
      commercial: false,
      updatedAt: "",
    };
    const loaded = validateProject(JSON.parse(JSON.stringify(project)));
    expect(loaded.textures!.at(-1)!.preset).toBe(first.id);
    const bad = presetLayer("a", first, image);
    bad.preset = "not an id!";
    expect(() =>
      validateProject({ ...project, textures: [...defaultTextures(), bad] }),
    ).toThrow();
  });
});

describe("photo textures for the biomes", () => {
  it("includes a tile for each ground the Realistic style paints with", () => {
    const sources = new Set(TEXTURE_PRESETS.map((p) => p.src));
    for (const name of [
      "red-earth",
      "burned-ground",
      "cracked-mud",
      "withered-grass",
      "sparse-grass",
      "pine-needles",
      "forest-mud",
      "trampled-snow",
    ])
      expect(sources.has(`/assets/textures/${name}.jpg`), name).toBe(true);
  });

  it("has a Russian name for every preset", () => {
    for (const p of TEXTURE_PRESETS) expect(ru[p.name], p.name).toBeTruthy();
  });
});
