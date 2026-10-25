import { describe, expect, it } from "vitest";
import { decorPack, decorSetFor } from "./style-decor";
import { symbolSetFor } from "./symbol-sets";
import { AMANZ_SYMBOL_SPRITES, SYMBOL_SPRITES } from "./symbols";
import type { MapData } from "./types";

const sheet = (style: string, stampPacks?: string[], kind = "world") =>
  ({ kind, settings: { style, stampPacks } }) as unknown as MapData;

describe("pictures that follow the chosen stamp packs", () => {
  it("draw settlements with Kenney only while Kenney is among the packs", () => {
    // A style's own collection counts: Old ink has Kenney's, Painted fantasy
    // (AI_GEN, which has no settlements) and Realistic (none) the drawn ones.
    expect(symbolSetFor(sheet("ink")).sprites).toBe(SYMBOL_SPRITES);
    expect(symbolSetFor(sheet("fantasy")).sprites).toEqual({});
    expect(symbolSetFor(sheet("realistic")).sprites).toEqual({});
    expect(
      symbolSetFor(sheet("fantasy", ["ai-gen", "cartography"])).sprites,
    ).toBe(SYMBOL_SPRITES);
    expect(symbolSetFor(sheet("ink", ["amanz-lite", "ai-gen"])).sprites).toBe(
      AMANZ_SYMBOL_SPRITES,
    );
    // With no pack that has settlement pictures, the app's own drawn symbols.
    expect(symbolSetFor(sheet("ink", ["ai-gen"])).sprites).toEqual({});
    // Towns and dungeons have no choice of packs: theirs stay Kenney.
    expect(symbolSetFor(sheet("fantasy", ["ai-gen"], "city")).sprites).toBe(
      SYMBOL_SPRITES,
    );
  });

  it("decorate the land from the style's collection when chosen, else the first chosen", () => {
    expect(decorPack({ style: "ink" })).toBe("cartography");
    expect(decorPack({ style: "ink", stampPacks: ["ai-gen"] })).toBe("ai-gen");
    expect(
      decorPack({ style: "fantasy", stampPacks: ["cartography", "ai-gen"] }),
    ).toBe("ai-gen");
    expect(decorPack({ style: "fantasy", stampPacks: ["amanz-lite"] })).toBe(
      "amanz-lite",
    );
    expect(decorSetFor({ style: "ink", stampPacks: [] }).none).toBe(true);
    // Realistic stays bare, whatever stamps it has.
    expect(
      decorPack({ style: "realistic", stampPacks: ["ai-gen"] }),
    ).toBeUndefined();
  });

  it("never draws a Kenney picture once Kenney is left out", () => {
    for (const style of ["ink", "fantasy"])
      for (const packs of [
        ["ai-gen"],
        ["amanz-lite"],
        ["ai-gen", "amanz-lite"],
      ]) {
        const { pools } = decorSetFor({ style, stampPacks: packs });
        for (const pool of Object.values(pools))
          for (const url of pool) expect(url).not.toMatch(/cartography/);
        for (const url of Object.values(
          symbolSetFor(sheet(style, packs)).sprites,
        ))
          expect(url).not.toMatch(/cartography/);
      }
  });
});
