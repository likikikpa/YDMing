import { LEXICONS } from "./names-data";
import type { Culture } from "./names-data";

type Rand = () => number;
const pick = <T>(list: readonly T[], r: Rand): T =>
  list[Math.floor(r() * list.length)];
const w = (list: string) => list.split(/\s+/).filter(Boolean);

/** What a named stretch of land or water is. */
export type Feature = "mountains" | "forest" | "sea";

const ADJECTIVES: Record<Feature, string[]> = {
  mountains: w(
    "Iron Grey Broken Sleeping Ashen Frost Raven Sunder Storm Thunder Black Silent Old Pale",
  ),
  forest: w(
    "Whispering Elder Dark Green Silent Ancient Tangled Mossy Hollow Lost Sunless Verdant",
  ),
  sea: w(
    "Silver Grey Sunless Sapphire Stormy Quiet Crimson Salt Restless Pale Glass Mourning",
  ),
};

const KINDS: Record<Feature, Record<Culture, string[]>> = {
  mountains: {
    human: w("Mountains Peaks Range Teeth Spine Heights"),
    elven: w("Heights Peaks Spires Mountains"),
    dwarven: w("Mountains Peaks Heights Range"),
    northern: w("Fells Mountains Peaks Teeth"),
    southern: w("Mountains Peaks Alps Range"),
  },
  forest: {
    human: w("Forest Woods Wildwood Weald Grove"),
    elven: w("Forest Glades Wood Groves"),
    dwarven: w("Forest Woods Thicket"),
    northern: w("Woods Forest Holt"),
    southern: w("Forest Woods Selva"),
  },
  sea: {
    human: w("Sea Ocean Deep Strait"),
    elven: w("Sea Waters Deep"),
    dwarven: w("Sea Deep Waters"),
    northern: w("Sea Ocean Fjord Deep"),
    southern: w("Sea Mare Ocean"),
  },
};

/** The word that names a kingdom after its capital: "Oldreach Dominion", "Vel Nimiel Realm". */
const REALMS: Record<Culture, string[]> = {
  human: w("Reach Marches Dominion Vale Kingdom Shire Realm"),
  elven: w("Realm Courts Dale Vale"),
  dwarven: w("Holds Deeps Halls Kingdom"),
  northern: w("Marches Lands Reaches Jarldom"),
  southern: w("Provinces Principality Duchy Republic"),
};

/** A kingdom's title word for its number `n`, in its culture's speech. */
export const realmWord = (culture: Culture, n: number) =>
  REALMS[culture][n % REALMS[culture].length];

/** A name for a mountain range, forest or sea. */
export function featureName(r: Rand, culture: Culture, kind: Feature) {
  const lex = LEXICONS[culture],
    head = pick(lex.heads, r),
    what = pick(KINDS[kind][culture], r),
    roll = r();
  if (roll < 0.45) return `The ${pick(ADJECTIVES[kind], r)} ${what}`;
  if (roll < 0.8) return kind === "sea" ? `Sea of ${head}` : `${head} ${what}`;
  return kind === "forest"
    ? `${head}${pick(["wood", "weald", "holt"], r)}`.replace(/^./, (c) =>
        c.toUpperCase(),
      )
    : `${what} of ${head}`;
}
