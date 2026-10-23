import { describe, expect, it } from "vitest";
import {
  MAP_STYLES,
  PICKER_STYLES,
  RETIRED_STYLES,
  resolveStyle,
  styleOf,
} from "./map-styles";
import { STAMP_PACKS } from "./packs";

describe("map styles", () => {
  it("keeps every current style as it is", () => {
    for (const id of ["ink", "fantasy"] as const)
      expect(resolveStyle(id)).toBe(id);
  });

  it("draws maps saved in the retired Parchment style as Old ink", () => {
    expect(resolveStyle("parchment")).toBe("ink");
    expect(styleOf({ style: "parchment" }).label).toBe("Old ink");
    expect(styleOf({ style: "parchment" }).stampPack).toBe("cartography");
    expect(PICKER_STYLES).not.toContain("parchment");
    expect(PICKER_STYLES).toEqual(["fantasy", "ink", "realistic"]);
  });

  it("offers Realistic with no stamp collection, since its ground carries the map", () => {
    expect(resolveStyle("realistic")).toBe("realistic");
    expect(styleOf({ style: "realistic" }).label).toBe("Realistic");
    expect(styleOf({ style: "realistic" }).stampPack).toBeUndefined();
  });

  it("draws maps saved in the retired Atlas style as Painted fantasy", () => {
    expect(resolveStyle("atlas")).toBe("fantasy");
    expect(styleOf({ style: "atlas" }).label).toBe("Painted fantasy");
    expect(PICKER_STYLES).not.toContain("atlas");
  });

  it("draws unknown or missing ids as Painted fantasy, never throwing", () => {
    expect(resolveStyle(undefined)).toBe("fantasy");
    expect(resolveStyle("")).toBe("fantasy");
    expect(resolveStyle("watercolour")).toBe("fantasy");
    // Names on Object.prototype are not styles.
    expect(resolveStyle("toString")).toBe("fantasy");
    expect(resolveStyle("__proto__")).toBe("fantasy");
    expect(resolveStyle("hasOwnProperty")).toBe("fantasy");
  });

  it("draws maps saved in the retired Painted style as Painted fantasy", () => {
    expect(resolveStyle("painted")).toBe("fantasy");
    expect(styleOf({ style: "painted" }).label).toBe("Painted fantasy");
    expect(PICKER_STYLES).not.toContain("painted");
    expect(PICKER_STYLES).toContain("fantasy");
  });

  it("offers only styles that exist and are not retired", () => {
    for (const id of PICKER_STYLES) {
      expect(MAP_STYLES[id]).toBeDefined();
      expect(RETIRED_STYLES[id]).toBeUndefined();
    }
  });

  it("replaces a retired style by one that is not itself retired", () => {
    for (const [from, to] of Object.entries(RETIRED_STYLES)) {
      expect(MAP_STYLES[to]).toBeDefined();
      expect(RETIRED_STYLES[to]).toBeUndefined();
      expect(resolveStyle(from)).toBe(to);
    }
  });

  it("points every style at a Library collection that exists", () => {
    const packs = new Set(STAMP_PACKS.map((p) => p.key));
    for (const style of Object.values(MAP_STYLES))
      if (style.stampPack) expect(packs.has(style.stampPack)).toBe(true);
  });

  it("reads the style out of a map's settings", () => {
    expect(styleOf({ style: "ink" }).label).toBe("Old ink");
    expect(styleOf({ style: "nonsense" }).id).toBe("fantasy");
  });
});
