import { describe, expect, it } from "vitest";
import { PACK_STAMPS } from "./packs";
import { kindOf, kindPictures, packKinds, packSprite } from "./scatter-kinds";

describe("kindOf", () => {
  it("sorts the AI_GEN pictures", () => {
    expect(kindOf("/assets/ai-gen/tree-oak.webp")?.key).toBe("trees");
    expect(kindOf("/assets/ai-gen/tree-palm.webp")?.key).toBe("trees");
    expect(kindOf("/assets/ai-gen/peak-snow.webp")?.key).toBe("mountains");
    expect(kindOf("/assets/ai-gen/volcano.webp")?.key).toBe("mountains");
    expect(kindOf("/assets/ai-gen/boulders.webp")?.key).toBe("rocks");
    expect(kindOf("/assets/ai-gen/forest-bramble.webp")?.key).toBe(
      "undergrowth",
    );
  });
  it("sorts the Kenney pictures, mountains before rocks", () => {
    expect(kindOf("/assets/cartography/treePine.png")?.key).toBe("trees");
    expect(kindOf("/assets/cartography/palmLarge.png")?.key).toBe("trees");
    expect(kindOf("/assets/cartography/rocksMountain.png")?.key).toBe(
      "mountains",
    );
    expect(kindOf("/assets/cartography/rocksTall.png")?.key).toBe("rocks");
    expect(kindOf("/assets/cartography/cactus.png")?.key).toBe("undergrowth");
  });
  it("leaves out buildings, dungeon and city pictures, and imports", () => {
    expect(kindOf("/assets/cartography/castle.png")).toBeUndefined();
    expect(kindOf("/assets/ai-gen/dungeon-boulder.webp")).toBeUndefined();
    expect(kindOf("/assets/ai-gen/city-oak.webp")).toBeUndefined();
    expect(kindOf("data:image/png;base64,/tree")).toBeUndefined();
  });
  it("only turns what looks right turned", () => {
    expect(kindOf("/assets/ai-gen/tree-oak.webp")?.turn).toBe(0);
    expect(kindOf("/assets/ai-gen/boulders.webp")?.turn).toBe(180);
  });
});

describe("collections", () => {
  it("lists every kind of the AI_GEN set with its pictures", () => {
    const keys = packKinds("ai-gen").map((k) => k.key);
    expect(keys).toEqual(["mountains", "trees", "rocks", "undergrowth"]);
    expect(kindPictures("ai-gen", "trees").length).toBeGreaterThanOrEqual(18);
  });
  it("lists only what a collection has", () => {
    expect(packKinds("gosbell")).toEqual([]);
    expect(kindPictures("ai-gen", "nothing")).toEqual([]);
  });
  it("gives every picture to one kind only", () => {
    const seen = new Set<string>();
    for (const k of packKinds("ai-gen"))
      for (const p of kindPictures("ai-gen", k.key)) {
        expect(seen.has(p.sprite.src)).toBe(false);
        seen.add(p.sprite.src);
      }
  });
  it("keeps a picture's credit when the pack needs one", () => {
    const amanz = PACK_STAMPS.find((a) => a.pack === "amanz-lite")!;
    expect(packSprite(amanz).credit?.id).toBe("bundled-amanz-lite");
  });
});
