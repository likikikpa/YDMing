import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BUNDLED_SPRITE_PACKS, isBundledSprite } from "./bundled-assets";
import { PACK_STAMPS, STAMP_PACKS } from "./packs";

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
