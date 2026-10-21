// The sprite side of the image search: a local index of map-ready sprites
// (data/sprite-index.json, built by scripts/build-sprite-index.mjs) and the
// rules that decide whether a query wants sprites or pictures.
import { readFileSync } from "node:fs";
import {
  searchCommons,
  searchOpenGameArt,
  searchOpenverse,
} from "./server-sources.mjs";

const ART_WORDS = new Set(
  "realistic realism photo photograph photography picture painting painted artwork art illustration render rendering portrait scenery concept detailed hd 4k wallpaper image real".split(
    " ",
  ),
);
const SPRITE_WORDS = new Set(
  "sprite icon stamp token symbol pixel tile clipart silhouette topdown isometric asset".split(
    " ",
  ),
);
const STOP = new Set("a an the of and with on in at for to".split(" "));
/** Icons of modern things: rarely wanted on a fantasy map, so they go last. */
const MODERN = new Set(
  "download upload computer laptop phone smartphone usb wifi battery keyboard cursor email internet server database cable plug car truck jet rocket satellite robot pistol rifle".split(
    " ",
  ),
);

/** Words a DM types, and the names the sprite sets use for the same thing. */
const SYNONYMS = {
  tree: ["forest", "oak", "pine", "birch", "willow", "palm"],
  forest: ["tree", "pine", "wood"],
  wood: ["forest", "tree"],
  town: ["village", "city", "house"],
  city: ["castle", "town", "village"],
  village: ["hut", "house", "town"],
  mountain: ["peak", "volcano", "hill"],
  hill: ["mountain"],
  cave: ["cavern", "dungeon"],
  dungeon: ["cave", "stair", "door"],
  inn: ["tavern"],
  tavern: ["inn", "beer"],
  ship: ["boat", "galleon", "sail"],
  boat: ["ship", "canoe"],
  camp: ["tent", "campfire"],
  ruin: ["ancient"],
  treasure: ["chest", "coin", "gold"],
  church: ["temple", "chapel"],
  temple: ["church", "shrine"],
  fort: ["castle", "tower", "fortress"],
  castle: ["fort", "fortress", "tower"],
  sea: ["wave", "water"],
  lake: ["water", "pond"],
  monster: ["dragon", "beast"],
};

export function stem(word) {
  if (word.length > 4 && word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.length > 4 && /(s|x|ch|sh)es$/.test(word)) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss"))
    return word.slice(0, -1);
  return word;
}

export const words = (text) =>
  text
    .toLowerCase()
    .replace(/top-down/g, "topdown")
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !STOP.has(w))
    .map(stem);

/**
 * "sprite" unless the query asks for a picture: a word like "realistic" or
 * "photo", or a long description. Sprite words ("icon", "token") always win.
 * `terms` is the query without those mode words.
 */
export function classifyQuery(q) {
  const all = words(q);
  // The subject unstemmed, for the upstream searches: "cloud realistic
  // picture" asks Wikimedia for bitmaps of "cloud".
  const text = q
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => {
      const word = stem(w.replace(/[^a-z0-9]/g, ""));
      return !SPRITE_WORDS.has(word) && !ART_WORDS.has(word);
    })
    .join(" ");
  const terms = all.filter((w) => !ART_WORDS.has(w) && !SPRITE_WORDS.has(w));
  const mode = all.some((w) => SPRITE_WORDS.has(w))
    ? "sprite"
    : all.some((w) => ART_WORDS.has(w)) || all.length >= 4
      ? "art"
      : "sprite";
  return { mode, terms: terms.length ? terms : all, text: text || q };
}

const title = (slug) =>
  slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

export function loadSpriteIndex(
  file = new URL("./data/sprite-index.json", import.meta.url),
) {
  const raw = JSON.parse(readFileSync(file, "utf8"));
  const kenney = raw.kenney.map((k) => ({
    look: k.pack === "medieval" ? "colour" : "ink",
    tags: new Set(words(k.name)),
    result: {
      id: `kenney:${k.src}`,
      name: k.name,
      author: "Kenney",
      license: "CC0 1.0",
      url: k.source,
      image: k.src,
      thumbnail: k.src,
    },
  }));
  const icons = raw.gameIcons.icons.map((path) => {
    const [folder, name] = path.split("/");
    return {
      look: "ink",
      tags: new Set(words(name)),
      result: {
        id: `game-icons:${path}`,
        name: title(name),
        author: `${title(folder)} (game-icons.net)`,
        license: "CC BY 3.0",
        url: `https://game-icons.net/1x1/${path}.html`,
        image: `${raw.gameIcons.base}${path}.svg`,
        thumbnail: `${raw.gameIcons.base}${path}.svg`,
      },
    };
  });
  return { base: raw.gameIcons.base, entries: [...kenney, ...icons] };
}

/**
 * Sprites whose name has every query word (or a synonym of it), best first:
 * exact words beat synonyms, short names beat long ones, and ink sprites suit
 * parchment and atlas maps while coloured ones suit painted maps.
 */
export function searchIndex(
  index,
  terms,
  { style = "parchment", limit = 30 } = {},
) {
  if (!terms.length) return [];
  const scored = [];
  for (const e of index.entries) {
    let score = 0;
    for (const t of terms) {
      if (e.tags.has(t)) score += 3;
      else if (SYNONYMS[t]?.some((s) => e.tags.has(s))) score += 1.5;
      else {
        score = -1;
        break;
      }
    }
    if (score < 0) continue;
    score -= 0.2 * Math.max(0, e.tags.size - terms.length);
    for (const tag of e.tags) if (MODERN.has(tag)) score -= 2;
    if ((style === "painted") === (e.look === "colour")) score += 0.5;
    scored.push({ score, result: e.result });
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.result);
}

/** game-icons are white on a black square; a map stamp wants dark ink on nothing. */
export const inkIcon = (svg, ink = "#3b2a1a") =>
  svg
    .replace(/<path d="M0 0h512v512H0z"\s*\/>/, "")
    .replace(/fill="#fff(?:fff)?"/gi, `fill="${ink}"`);

/**
 * The default search. A sprite query shows the index first, then OpenGameArt
 * and Openverse drawings; a picture query shows Wikimedia and Openverse
 * pictures first, then a few sprites. A source that fails is skipped as long
 * as another one has results.
 */
export async function searchAuto({
  index,
  fetchImpl,
  userAgent,
  q,
  style,
  wait = 6000,
}) {
  const { mode, terms, text } = classifyQuery(q);
  const local = searchIndex(index, terms, {
    style,
    limit: mode === "sprite" ? 30 : 8,
  });
  const ask = { fetchImpl, userAgent, mode };
  // A slow source must not hold up the others: past `wait` it counts as failed.
  const within = (search, name) => {
    let timer;
    const late = new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`${name} did not answer in time.`)),
        wait,
      );
    });
    return Promise.race([search, late]).finally(() => clearTimeout(timer));
  };
  const settled = await Promise.allSettled(
    mode === "sprite"
      ? [
          within(searchOpenGameArt({ ...ask, q: text }), "OpenGameArt"),
          within(searchOpenverse({ ...ask, q: text }), "Openverse"),
        ]
      : [
          within(searchCommons({ ...ask, q: text }), "Wikimedia"),
          within(searchOpenverse({ ...ask, q: text }), "Openverse"),
        ],
  );
  const remote = settled.flatMap((s) =>
    s.status === "fulfilled" ? s.value : [],
  );
  const results =
    mode === "sprite" ? [...local, ...remote] : [...remote, ...local];
  if (!results.length) {
    const failed = settled.find((s) => s.status === "rejected");
    if (failed) throw failed.reason;
  }
  const seen = new Set();
  return results.filter((r) => !seen.has(r.image) && seen.add(r.image));
}
