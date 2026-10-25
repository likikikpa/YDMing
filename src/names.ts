import {
  CULTURES,
  DUNGEON_ADJECTIVES,
  DUNGEON_GRAVES,
  DUNGEON_PLACES,
  LEXICONS,
  OWNERS,
  PEOPLE,
  PLACES,
} from "./names-data";
import type { Culture, Ground, Lexicon } from "./names-data";

export { CULTURES } from "./names-data";
export type { Culture, Ground } from "./names-data";

/** What a name should suit: the ground under the settlement, water beside it, and its size. */
export interface NameSite {
  ground: Ground;
  coast?: boolean;
  river?: boolean;
  size?: "city" | "town" | "village";
}

type Rand = () => number;

const pick = <T>(list: readonly T[], r: Rand): T =>
  list[Math.floor(r() * list.length)];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Joins two word parts into one word: no run of three equal letters, no doubled join letter. */
function join(a: string, b: string) {
  const tail = b.toLowerCase();
  return cap(
    a + (a.slice(-1).toLowerCase() === tail[0] ? tail.slice(1) : tail),
  );
}

/** An ending that suits the site: water first, then the ground, else any. */
function ending(lex: Lexicon, site: NameSite, r: Rand) {
  const roll = r();
  if (site.coast && roll < 0.55) return pick(lex.coast, r);
  if (site.river && roll < 0.35) return pick(lex.river, r);
  if (site.ground !== "plain" && roll < 0.7)
    return pick(lex.byGround[site.ground], r);
  return pick(lex.tails, r);
}

/** A name start that suits the site where the culture has such words, else any. */
function head(lex: Lexicon, site: NameSite, r: Rand) {
  const own = site.coast
    ? lex.flavour?.coast
    : site.ground !== "plain"
      ? lex.flavour?.[site.ground]
      : undefined;
  return own && r() < 0.6 ? pick(own, r) : pick(lex.heads, r);
}

const compound = (lex: Lexicon, site: NameSite, r: Rand) =>
  join(head(lex, site, r), ending(lex, site, r));

const HUMAN_WATERS = ["mere", "brook", "weald", "marsh", "dale", "hythe"];

/** Names in the speech of one culture. Each builder takes the same weighted roll. */
const BUILD: Record<Culture, (site: NameSite, r: Rand) => string> = {
  human(site, r) {
    const lex = LEXICONS.human,
      roll = r();
    if (roll < 0.45) return compound(lex, site, r);
    if (roll < 0.6) {
      const base = compound(lex, site, r);
      if (site.coast && r() < 0.5) return `Port ${pick(lex.heads, r)}`;
      const titles = lex.titles.filter(
        (t) =>
          t !== "Port" &&
          (site.size !== "village" || t !== "Great") &&
          (site.ground === "mountain" || t !== "Fort"),
      );
      return `${pick(titles, r)} ${base}`;
    }
    if (roll < 0.75) return `${pick(OWNERS, r)}'s ${pick(PLACES, r)}`;
    if (roll < 0.83)
      return `${compound(lex, site, r)}-on-${cap(pick(HUMAN_WATERS, r))}`;
    return join(head(lex, site, r), pick(lex.byGround[site.ground], r));
  },
  elven(site, r) {
    const lex = LEXICONS.elven,
      roll = r();
    if (roll < 0.55) return compound(lex, site, r);
    if (roll < 0.8)
      return join(
        join(
          head(lex, site, r),
          pick(["an", "il", "or", "ae", "el", "in", "ar", "ith", "ol"], r),
        ),
        ending(lex, site, r),
      );
    return `${pick(lex.titles, r)} ${compound(lex, site, r)}`;
  },
  dwarven(site, r) {
    const lex = LEXICONS.dwarven,
      roll = r();
    if (roll < 0.65) return compound(lex, site, r);
    // As a second word an ending must be a word of its own, not a fragment like "ar".
    const word = () => {
      let e = ending(lex, site, r);
      for (let i = 0; i < 20 && e.length < 4; i++) e = ending(lex, site, r);
      return cap(e);
    };
    if (roll < 0.93) return `${head(lex, site, r)} ${word()}`;
    return `${pick(lex.titles, r)} ${word()}`;
  },
  northern(site, r) {
    const lex = LEXICONS.northern,
      roll = r();
    if (roll < 0.5) return compound(lex, site, r);
    if (roll < 0.65) return `${pick(lex.heads, r)}'s ${pick(PLACES, r)}`;
    if (roll < 0.83)
      return join(head(lex, site, r), pick(lex.byGround[site.ground], r));
    return `${pick(lex.titles, r)} ${compound(lex, site, r)}`;
  },
  southern(site, r) {
    const lex = LEXICONS.southern,
      roll = r();
    if (roll < 0.55) return compound(lex, site, r);
    if (roll < 0.8) {
      const t = site.coast
        ? "Porto"
        : site.ground === "mountain"
          ? "Monte"
          : pick(lex.titles, r);
      return `${t} ${compound(lex, site, r)}`;
    }
    return join(head(lex, site, r), pick(lex.byGround[site.ground], r));
  },
};

const ROMAN = ["II", "III", "IV", "V", "VI", "VII"];

/** A word longer than this makes a name hard to read on a map. */
const LONGEST_WORD = 13;
const readable = (name: string) =>
  name.split(" ").every((word) => word.length <= LONGEST_WORD);

/** Makes names until one is short enough and not in `taken`, then adds it; a last resort numbers it. */
function unique(make: () => string, taken?: Set<string>) {
  let name = make();
  for (
    let i = 0;
    i < 40 && (!readable(name) || taken?.has(name.toLowerCase()));
    i++
  )
    name = make();
  if (!taken) return name;
  for (let n = 0; taken.has(name.toLowerCase()); n++)
    name = `${name.replace(/ [IV]+$/, "")} ${ROMAN[n % ROMAN.length]}`;
  taken.add(name.toLowerCase());
  return name;
}

/** A name for a town, village or city. `taken` keeps names on one map apart. */
export function townName(
  r: Rand,
  culture: Culture = "human",
  site: NameSite = { ground: "plain" },
  taken?: Set<string>,
) {
  return unique(() => BUILD[culture](site, r), taken);
}

/** The name the old generator made: two joined words, for owners and fallbacks. */
export const simpleName = (r: Rand) =>
  compound(LEXICONS.human, { ground: "plain" }, r);

/** A name for a dungeon, ruin or lair in the speech of a culture. */
export function dungeonName(
  r: Rand,
  culture: Culture = "human",
  taken?: Set<string>,
) {
  const lex = LEXICONS[culture],
    place = () => pick(DUNGEON_PLACES[culture], r),
    person = () => (culture === "human" ? pick(PEOPLE, r) : pick(lex.heads, r)),
    // English-sounding endings would not suit an elven or southern name.
    gloom =
      culture === "elven" || culture === "southern"
        ? lex.tails
        : ["maw", "gloom", "deep", "shade", "hollow"];
  return unique(() => {
    const roll = r();
    if (roll < 0.45) return `The ${pick(DUNGEON_ADJECTIVES, r)} ${place()}`;
    if (roll < 0.65) return `${person()}'s ${place()}`;
    if (roll < 0.8) return `${pick(DUNGEON_GRAVES, r)} of ${person()}`;
    return `${join(pick(lex.heads, r), pick(gloom, r))} ${place()}`;
  }, taken);
}

/** Cultures for `count` kingdoms: all different while there are enough, then repeating. */
export function kingdomCultures(r: Rand, count: number): Culture[] {
  const order = [...CULTURES];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return Array.from(
    { length: Math.max(0, count) },
    (_, n) => order[n % order.length],
  );
}
