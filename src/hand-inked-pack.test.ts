import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decorSetFor } from "./style-decor";
import { PACK_STAMPS, stampMatches } from "./packs";
import { styleSymbolUrls } from "./style-symbols";
import { kindOf } from "./scatter-kinds";

const pack = PACK_STAMPS.filter((s) => s.pack === "hand-inked");
const onDisk = (src: string) => existsSync(`public${src}`);

describe("Hand-inked pack", () => {
  it("lists only pictures that exist, with a category and tags", () => {
    expect(pack.length).toBeGreaterThanOrEqual(40);
    for (const s of pack) {
      expect(onDisk(s.src), s.src).toBe(true);
      expect(s.category, s.id).toBeTruthy();
      expect(s.tags?.length, s.id).toBeGreaterThan(0);
      expect(s.aspect).toBeGreaterThan(0.2);
      expect(s.aspect).toBeLessThan(5);
    }
    expect(new Set(pack.map((s) => s.id)).size).toBe(pack.length);
  });

  it("records where the pictures come from", () => {
    const licence = readFileSync(
      "public/assets/hand-inked/License.txt",
      "utf8",
    );
    expect(licence).toMatch(/generated with an AI image model/);
  });

  it("gives the scatter brush trees, mountains and rocks to draw", () => {
    const kinds = new Map<string, number>();
    for (const s of pack) {
      const k = kindOf(s.src)?.key;
      if (k) kinds.set(k, (kinds.get(k) ?? 0) + 1);
    }
    expect(kinds.get("trees")).toBeGreaterThanOrEqual(10);
    expect(kinds.get("mountains")).toBeGreaterThanOrEqual(8);
    expect(kinds.get("rocks")).toBeGreaterThanOrEqual(1);
    // Buildings and ships are placed by hand, never sown by the brush or the generator.
    for (const s of pack.filter((p) => p.category !== "Trees"))
      if (/Buildings|Fortifications|Ships/.test(s.category!))
        expect(kindOf(s.src), s.id).toBeUndefined();
  });

  it("is what the Hand-drawn style scatters and draws symbols from", () => {
    const set = decorSetFor("drawn");
    const urls = [
      ...Object.values(set.pools).flat(),
      ...styleSymbolUrls("drawn"),
    ];
    expect(urls.length).toBeGreaterThan(20);
    for (const u of urls) {
      expect(u).toMatch(/^\/assets\/hand-inked\//);
      expect(onDisk(u), u).toBe(true);
    }
  });
});

describe("Library search", () => {
  const find = (q: string) => pack.filter((s) => stampMatches(s, q));

  it("matches names, categories and tags, every word", () => {
    expect(find("").length).toBe(pack.length);
    expect(find("cathedral").map((s) => s.id)).toContain(
      "hand-inked-cathedral",
    );
    expect(find("ships").length).toBe(6);
    expect(
      find("snow")
        .map((s) => s.id)
        .sort(),
    ).toEqual(["hand-inked-peak-snow", "hand-inked-range-snow-twin"]);
    expect(find("conifer evergreen").length).toBe(6);
    expect(find("conifer cathedral")).toEqual([]);
  });

  it("is not case sensitive and ignores extra spaces", () => {
    expect(find("  SNOW  peak ").length).toBeGreaterThanOrEqual(1);
  });
});
