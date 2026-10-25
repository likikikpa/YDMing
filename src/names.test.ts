import { describe, expect, it } from "vitest";
import { random } from "./random";
import { LEXICONS } from "./names-data";
import {
  CULTURES,
  dungeonName,
  kingdomCultures,
  simpleName,
  townName,
} from "./names";
import type { Culture, NameSite } from "./names";

const many = (
  seed: string,
  culture: Culture,
  site: NameSite,
  n = 400,
  taken?: Set<string>,
) => {
  const r = random(seed);
  return Array.from({ length: n }, () => townName(r, culture, site, taken));
};
const share = (names: string[], pattern: RegExp) =>
  names.filter((n) => pattern.test(n)).length / names.length;

describe("townName", () => {
  it("is the same for the same seed and different for another", () => {
    const a = many("same", "human", { ground: "plain" }, 50),
      b = many("same", "human", { ground: "plain" }, 50),
      c = many("other", "human", { ground: "plain" }, 50);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it.each(CULTURES)("gives %s names that are well formed", (culture) => {
    for (const site of [
      { ground: "plain" as const },
      { ground: "mountain" as const, coast: true },
      { ground: "desert" as const, river: true },
      { ground: "snow" as const, size: "village" as const },
      { ground: "swamp" as const, size: "city" as const },
      { ground: "forest" as const },
    ])
      for (const name of many(`form-${culture}`, culture, site, 150)) {
        expect(name).toMatch(/^[A-Z][A-Za-z' -]+$/);
        expect(name.length).toBeGreaterThanOrEqual(3);
        expect(name).not.toMatch(/(.)\1\1/i);
        expect(name).not.toMatch(/ {2}|^ | $/);
        for (const word of name.split(" "))
          expect(word.length).toBeLessThanOrEqual(13);
      }
  });

  it.each(CULTURES)("makes plenty of different %s names", (culture) => {
    const distinct = (n: number, seed: string) =>
      new Set(
        many(seed, culture, { ground: "plain" }, n).map((x) => x.toLowerCase()),
      ).size;
    // A big map has about a hundred settlements; a thousand draws still repeat little.
    expect(distinct(100, `variety-${culture}`)).toBeGreaterThanOrEqual(94);
    expect(distinct(1000, `variety-${culture}`)).toBeGreaterThan(780);
  });

  it("keeps names apart on one map, even asking for far more than it has easy ones", () => {
    const taken = new Set<string>(),
      names = many("taken", "dwarven", { ground: "mountain" }, 1500, taken);
    expect(new Set(names.map((n) => n.toLowerCase())).size).toBe(1500);
    expect(taken.size).toBe(1500);
  });

  it("uses more than the old fifteen parts and ten endings", () => {
    const names = many("old", "human", { ground: "plain" }, 3000);
    const heads = new Set(names.map((n) => n.split(/[ '-]/)[0]));
    expect(heads.size).toBeGreaterThan(100);
  });

  it("makes cultures sound different", () => {
    const parts = (c: Culture) => {
      const lex = LEXICONS[c];
      return [
        ...lex.tails,
        ...Object.values(lex.byGround).flat(),
        ...lex.coast,
        ...lex.river,
      ].map((x) => x.toLowerCase());
    };
    // Every name has an ending from its own culture, or is the "X's Rest" kind.
    for (const culture of CULTURES) {
      const own = parts(culture);
      const names = many(`sound-${culture}`, culture, { ground: "plain" }, 300);
      const fits = names.filter(
        (n) =>
          /'s /.test(n) ||
          own.some((end) => n.toLowerCase().includes(end)) ||
          n.split(" ").length > 1,
      );
      expect(fits.length / names.length).toBeGreaterThan(0.97);
    }
    // Elven and dwarven endings do not turn up in each other's names.
    expect(
      share(
        many("x1", "elven", { ground: "plain" }, 300),
        /(heim|delve|forge|vik|stad|fjord)/i,
      ),
    ).toBe(0);
    expect(
      share(
        many("x2", "dwarven", { ground: "plain" }, 300),
        /(wen|aril|thas|iel)/i,
      ),
    ).toBeLessThan(0.03);
  });

  it("makes names that fit the ground and the water", () => {
    const coastal = many("coast", "human", { ground: "plain", coast: true }),
      inland = many("inland", "human", { ground: "plain" }),
      port = /(port|haven|mouth|wick|cove|harbour|strand|bay|ness|head|quay)/i;
    expect(share(coastal, port)).toBeGreaterThan(0.35);
    expect(share(inland, port)).toBeLessThan(0.1);
    const desert = many("desert", "human", { ground: "desert" }),
      dry =
        /(sun|dust|dry|salt|amber|red|sand|bleach|scorch|mirage|dune|wells|mesa|wash)/i;
    expect(share(desert, dry)).toBeGreaterThan(0.6);
    expect(
      share(
        many("green", "human", { ground: "plain" }),
        /(dune|scorch|mirage)/i,
      ),
    ).toBe(0);
    const mountain = many("mtn", "human", { ground: "mountain" }),
      rocky =
        /(stone|iron|high|crag|gray|eagle|hawk|flint|cairn|rook|cold|tor|peak|fell|gap|scar|rock|ridge)/i;
    expect(share(mountain, rocky)).toBeGreaterThan(0.6);
    const river = many("river", "human", { ground: "plain", river: true });
    expect(
      share(river, /(ford|bridge|mouth|wade|crossing|ferry)/i),
    ).toBeGreaterThan(0.25);
  });

  it("puts Port only on a coast", () => {
    expect(share(many("pi", "human", { ground: "plain" }), /^Port /)).toBe(0);
    expect(
      share(
        many("pc", "human", { ground: "plain", coast: true }, 600),
        /^Port /,
      ),
    ).toBeGreaterThan(0.03);
  });

  it("does not call a village Great", () => {
    expect(
      share(
        many("gv", "human", { ground: "plain", size: "village" }, 1000),
        /^Great /,
      ),
    ).toBe(0);
  });
});

describe("simpleName", () => {
  it("is one word", () => {
    const r = random("simple");
    for (let i = 0; i < 200; i++)
      expect(simpleName(r)).toMatch(/^[A-Z][a-z]+$/);
  });
});

describe("dungeonName", () => {
  it("makes varied, well formed names of every culture", () => {
    for (const culture of CULTURES) {
      const r = random(`d-${culture}`),
        taken = new Set<string>(),
        names = Array.from({ length: 300 }, () =>
          dungeonName(r, culture, taken),
        );
      expect(new Set(names).size).toBe(300);
      for (const n of names) {
        expect(n).toMatch(/^[A-Z][A-Za-z' -]+$/);
        expect(n).not.toMatch(/(.)\1\1/i);
      }
    }
  });
  it("sounds like its culture", () => {
    const r = random("dd");
    const dwarf = Array.from({ length: 200 }, () => dungeonName(r, "dwarven"));
    expect(
      share(
        dwarf,
        /(Delve|Mines|Forge|Hall|Vault|Deeps|Halls|Tomb|Grave|Barrow|Shrine|Cairn|Crypt)/,
      ),
    ).toBeGreaterThan(0.9);
    const south = Array.from({ length: 200 }, () => dungeonName(r, "southern"));
    expect(
      share(
        south,
        /(Catacombs|Temple|Cistern|Villa|Crypt|Ruins|Tomb|Grave|Barrow|Vault|Shrine|Cairn)/,
      ),
    ).toBeGreaterThan(0.9);
  });
});

describe("kingdomCultures", () => {
  it("gives neighbouring kingdoms different cultures while there are enough", () => {
    const four = kingdomCultures(random("k"), 4);
    expect(four).toHaveLength(4);
    expect(new Set(four).size).toBe(4);
    expect(new Set(kingdomCultures(random("k"), CULTURES.length)).size).toBe(
      CULTURES.length,
    );
  });
  it("repeats the cultures past five, is steady for a seed, and handles none", () => {
    const eight = kingdomCultures(random("k8"), 8);
    expect(eight).toHaveLength(8);
    expect(eight.slice(5)).toEqual(eight.slice(0, 3));
    expect(kingdomCultures(random("k8"), 8)).toEqual(eight);
    expect(kingdomCultures(random("k"), 0)).toEqual([]);
    expect(kingdomCultures(random("k"), -2)).toEqual([]);
  });
});
