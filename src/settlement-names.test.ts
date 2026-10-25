import { describe, expect, it } from "vitest";
import { generateMap } from "./generator";
import { kingdomCultures } from "./names";
import { LEXICONS } from "./names-data";
import type { Culture } from "./names";
import { random } from "./random";
import { siteAt } from "./settlement-site";
import { defaultSettings } from "./types";

const settlements = (seed: string, over = {}) => {
  const map = generateMap("world", { ...defaultSettings, seed, ...over });
  return {
    map,
    list: map.objects.filter((o) => o.id.startsWith("settlement-")),
  };
};
const fits = (name: string, culture: Culture) => {
  const lex = LEXICONS[culture],
    parts = [
      ...lex.tails,
      ...Object.values(lex.byGround).flat(),
      ...lex.coast,
      ...lex.river,
      ...lex.heads,
    ].map((x) => x.toLowerCase());
  return parts.some((p) => name.toLowerCase().includes(p));
};

describe("names of generated settlements", () => {
  it("are different from each other on a map", () => {
    for (const seed of ["alpha", "beta", "gamma", "delta"]) {
      const { list } = settlements(seed, {
        cities: 6,
        towns: 10,
        villages: 20,
        dungeons: 6,
      });
      const names = list.map((o) => o.name.toLowerCase());
      expect(names.length).toBeGreaterThan(20);
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it("are the same for the same seed, and a new seed gives new names", () => {
    const a = settlements("steady").list.map((o) => o.name),
      b = settlements("steady").list.map((o) => o.name),
      c = settlements("changed").list.map((o) => o.name);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it("do not move a settlement: names have their own random stream", () => {
    const a = settlements("place"),
      b = settlements("place", { kingdoms: 2 });
    expect(a.list.map((o) => [o.x, o.y])).toEqual(
      b.list.map((o) => [o.x, o.y]),
    );
  });

  it("give each kingdom's capital the culture of its kingdom", () => {
    let total = 0,
      right = 0;
    for (const seed of ["k1", "k2", "k3", "k4", "k5", "k6"]) {
      const { map, list } = settlements(seed, { kingdoms: 4, cities: 6 });
      const cultures = kingdomCultures(
        random(seed + "cultures"),
        map.settings.kingdoms,
      );
      list
        .filter((o) => o.kind === "city")
        .slice(0, 4)
        .forEach((o, n) => {
          total++;
          if (fits(o.name, cultures[n])) right++;
        });
    }
    expect(total).toBe(24);
    expect(right / total).toBeGreaterThan(0.95);
  });

  it("make the four kingdoms of a map sound different", () => {
    const { map } = settlements("kingdoms", { kingdoms: 4, cities: 4 });
    const cultures = kingdomCultures(
      random("kingdoms" + "cultures"),
      map.settings.kingdoms,
    );
    expect(new Set(cultures).size).toBe(4);
  });

  it("name dungeons as dungeons", () => {
    const { list } = settlements("crypts", { dungeons: 8 });
    const dungeons = list.filter((o) => o.kind === "dungeon");
    expect(dungeons.length).toBeGreaterThan(4);
    for (const d of dungeons)
      expect(d.name).toMatch(
        /(Crypt|Barrow|Mines|Caverns|Vault|Warren|Keep|Catacombs|Sanctum|Pit|Cellar|Spire|Grove|Ruins|Hall|Court|Delve|Forge|Deeps|Halls|Cairn|Mound|Longhouse|Temple|Cistern|Villa|Tomb|Grave|Shrine)/,
      );
  });
});

describe("siteAt", () => {
  const { map } = settlements("sites");
  const cellAt = (want: (i: number) => boolean) => {
    for (let i = 0; i < map.heights.length; i++)
      if (want(i))
        return {
          x: (((i % map.cols) + 0.5) / map.cols) * map.width,
          y: ((Math.floor(i / map.cols) + 0.5) / map.rows) * map.height,
        };
    throw new Error("no such cell");
  };
  const sea = map.settings.seaLevel;

  it("sees the shore next to the sea and no shore far inland", () => {
    const shore = cellAt((i) => {
      const x = i % map.cols,
        y = Math.floor(i / map.cols);
      return (
        x > 5 &&
        y > 5 &&
        x < map.cols - 5 &&
        y < map.rows - 5 &&
        map.heights[i] > sea + 0.04 &&
        map.heights[i] < 0.5 &&
        map.heights[i + 1] < sea
      );
    });
    expect(siteAt(map, shore.x, shore.y).coast).toBe(true);
    const inland = cellAt((i) => {
      const x = i % map.cols,
        y = Math.floor(i / map.cols);
      if (x < 12 || y < 12 || x > map.cols - 12 || y > map.rows - 12)
        return false;
      for (let dy = -8; dy <= 8; dy++)
        for (let dx = -8; dx <= 8; dx++)
          if (map.heights[i + dy * map.cols + dx] < sea) return false;
      return true;
    });
    expect(siteAt(map, inland.x, inland.y).coast).toBe(false);
  });

  it("sees a river close by", () => {
    const river = map.paths.find((p) => p.kind === "river")!;
    const p = river.points[Math.floor(river.points.length / 2)];
    expect(siteAt(map, p.x + 10, p.y).river).toBe(true);
    expect(siteAt(map, -500, -500).river).toBe(false);
  });

  it("calls high ground mountain", () => {
    const high = cellAt((i) => map.heights[i] > 0.62);
    expect(siteAt(map, high.x, high.y).ground).toBe("mountain");
  });

  it("carries the size it was asked for", () => {
    expect(siteAt(map, 100, 100, "town").size).toBe("town");
  });
});
