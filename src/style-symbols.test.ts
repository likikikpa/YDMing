import { describe, expect, it } from "vitest";
import { styleSymbol, styleSymbolUrls } from "./style-symbols";

describe("style symbols", () => {
  it("gives Old ink its own picture for the settlement kinds", () => {
    for (const kind of ["city", "village", "castle", "tower", "temple"])
      expect(styleSymbol("ink", kind, "a")).toMatch(
        /^\/assets\/hand-inked\/[\w-]+\.webp$/,
      );
  });

  it("keeps the glyph for other styles and for kinds it has no picture for", () => {
    expect(styleSymbol("fantasy", "village", "a")).toBeUndefined();
    expect(styleSymbol("realistic", "castle", "a")).toBeUndefined();
    expect(styleSymbol("ink", "dungeon", "a")).toBeUndefined();
    expect(styleSymbol("ink", "chest", "a")).toBeUndefined();
  });

  it("draws a retired or unknown style as Painted fantasy, with glyphs", () => {
    expect(styleSymbol("painted", "village", "a")).toBeUndefined();
    expect(styleSymbol("nonsense", "castle", "a")).toBeUndefined();
  });

  it("picks the same picture for the same id, and uses every variant over many ids", () => {
    expect(styleSymbol("ink", "village", "settlement-x-3")).toBe(
      styleSymbol("ink", "village", "settlement-x-3"),
    );
    const seen = new Set<string | undefined>();
    for (let i = 0; i < 200; i++)
      seen.add(styleSymbol("ink", "village", `settlement-s-${i}`));
    expect(seen.size).toBe(3);
  });

  it("lists every picture to preload once", () => {
    const urls = styleSymbolUrls("ink");
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls.length).toBeGreaterThan(5);
    expect(styleSymbolUrls("fantasy")).toEqual([]);
  });
});
