import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PATTERNS } from "./materials";
import { TEXTURE_PRESETS, presetLayer } from "./texture-presets";

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
