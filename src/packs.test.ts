import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BUNDLED_SPRITE_PACKS, isBundledSprite } from "./bundled-assets";
import { PACK_STAMPS, STAMP_PACKS } from "./packs";
import { spriteAssets, withStampAssets } from "./stamp-brush";
import type { MapData, Project } from "./types";

describe("bundled stamp packs", () => {
  it("lists every pack in the Library and every pack folder as bundled", () => {
    expect(STAMP_PACKS.map((p) => p.key)).toEqual(BUNDLED_SPRITE_PACKS);
    for (const p of PACK_STAMPS)
      expect(STAMP_PACKS.map((k) => k.key)).toContain(p.pack);
  });

  it("has a picture on disk for every listed sprite, with a path the saved-project check accepts", () => {
    const ids = new Set<string>();
    for (const s of PACK_STAMPS) {
      expect(ids.has(s.id), s.id).toBe(false);
      ids.add(s.id);
      expect(existsSync(`public${s.src}`), s.src).toBe(true);
      expect(isBundledSprite(s.src), s.src).toBe(true);
    }
  });

  it("credits every pack that is not CC0 in the world once its stamps are placed", () => {
    for (const pack of STAMP_PACKS) {
      if (/CC0|^AI generated/.test(pack.credit)) continue;
      expect(pack.attribution, pack.key).toBeDefined();
      expect(pack.attribution!.license).toMatch(/^CC BY/);
      expect(pack.attribution!.url).toMatch(/^https:\/\//);
    }
    const ids = STAMP_PACKS.flatMap((p) =>
      p.attribution ? [p.attribution.id] : [],
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps a CC BY pack's stamps credited when placed", () => {
    const pack = STAMP_PACKS.find((p) => p.key === "amanz-lite")!;
    const sprite = {
      src: "/assets/amanz-lite/tree-1.png",
      name: "Tree 1",
      credit: pack.attribution,
    };
    const map = {
      objects: [{ id: "o", creditId: pack.attribution!.id }],
    } as unknown as MapData;
    const project = { credits: [], images: {} } as unknown as Project;
    expect(withStampAssets(project, map, spriteAssets(sprite)).credits).toEqual(
      [pack.attribution],
    );
    // Picked but never placed: nothing is added.
    expect(
      withStampAssets(
        project,
        { objects: [] } as unknown as MapData,
        spriteAssets(sprite),
      ).credits,
    ).toEqual([]);
  });

  it("gives each pack a licence file next to its pictures", () => {
    for (const key of BUNDLED_SPRITE_PACKS)
      expect(existsSync(`public/assets/${key}/License.txt`), key).toBe(true);
    expect(readFileSync("public/assets/gosbell/License.txt", "utf8")).toMatch(
      /CC0/,
    );
  });

  it("describes the grid squares of dungeon sprites the way their pictures are shaped", () => {
    for (const s of PACK_STAMPS.filter((p) => p.cells)) {
      const [w, h] = s.cells!;
      expect(s.aspect, s.id).toBeCloseTo(w / h, 1);
    }
  });
});
