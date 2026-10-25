import { describe, expect, it } from "vitest";
import { generateMap } from "./generator";
import {
  detailSeed,
  GENERATED,
  LAND_PACKS,
  mapPacks,
  packCredits,
} from "./map-packs";
import { withPacks } from "./populate";
import { defaultSettings } from "./types";
import type { GeneratorSettings, MapData } from "./types";

const world = (seed: string, over: Partial<GeneratorSettings> = {}) =>
  generateMap("world", { ...defaultSettings, seed, ...over });
const stamps = (map: MapData) =>
  map.objects.filter((o) => o.id.startsWith(GENERATED));
const packOf = (src = "") => src.split("/")[2];

describe("stamp packs of a map", () => {
  it("offer the collections with trees, ranges, rocks or undergrowth", () => {
    expect([...LAND_PACKS].sort()).toEqual(
      ["ai-gen", "amanz-lite", "cartography"].sort(),
    );
  });

  it("follow the style until some are chosen, keeping only ones that exist", () => {
    expect(mapPacks({ style: "fantasy" })).toEqual(["ai-gen"]);
    expect(mapPacks({ style: "parchment" })).toEqual(["cartography"]);
    expect(mapPacks({ style: "realistic" })).toEqual([]);
    expect(
      mapPacks({ style: "fantasy", stampPacks: ["cartography", "nope"] }),
    ).toEqual(["cartography"]);
    expect(mapPacks({ style: "fantasy", stampPacks: [] })).toEqual([]);
  });

  it("ask for a credit only for a collection whose licence needs one", () => {
    expect(packCredits(["ai-gen", "cartography"])).toEqual([]);
    expect(packCredits(["amanz-lite"]).map((c) => c.license)).toEqual([
      "CC BY 4.0",
    ]);
  });

  it("fill a generated world from the chosen collections, whatever its style", () => {
    const mixed = stamps(
      world("packs1", {
        style: "fantasy",
        stampPacks: ["cartography", "amanz-lite"],
      }),
    );
    const used = new Set(mixed.map((o) => packOf(o.image)));
    expect([...used].sort()).toEqual(["amanz-lite", "cartography"]);
    expect(mixed.some((o) => o.creditId === "bundled-amanz-lite")).toBe(true);
    // Realistic has no collection of its own, but takes one that is chosen.
    expect(
      stamps(world("packs1", { style: "realistic", stampPacks: ["ai-gen"] }))
        .length,
    ).toBeGreaterThan(50);
  });

  it("place the stamps again when the choice changes, and back as they were", () => {
    const map = world("packs2", { style: "fantasy" }),
      ink = withPacks(map, ["cartography"]);
    expect(ink.settings.stampPacks).toEqual(["cartography"]);
    expect(stamps(ink).length).toBeGreaterThan(50);
    for (const o of stamps(ink)) expect(packOf(o.image)).toBe("cartography");
    expect(stamps(withPacks(ink, ["ai-gen"]))).toEqual(stamps(map));
    expect(stamps(withPacks(map, []))).toEqual([]);
    // Settlements, roads and names stay as they were.
    const rest = (m: MapData) =>
      m.objects.filter((o) => !o.id.startsWith(GENERATED));
    expect(rest(ink)).toEqual(rest(map));
  });

  it("only keep the choice on a map the generator did not fill", () => {
    const map = world("packs3", { detail: 0 });
    expect(stamps(withPacks(map, ["ai-gen"]))).toEqual([]);
  });

  it("read the seed back from the stamps, also after a reroll or with a dash", () => {
    const map = world("packs4");
    map.objects.push({ ...stamps(map)[0], id: `${GENERATED}MY-SEED-12` });
    map.objects = map.objects.filter(
      (o) => !o.id.startsWith(GENERATED) || o.id.includes("MY-SEED"),
    );
    expect(detailSeed(map)).toBe("MY-SEED");
    expect(detailSeed(world("packs5", { detail: 0 }))).toBe("packs5");
  });
});
