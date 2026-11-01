import aiGen from "./data/ai-gen.json";
import amanz from "./data/amanz-lite.json";
import classic from "./data/classic-dungeon.json";
import gosbell from "./data/gosbell.json";
import handInked from "./data/hand-inked.json";
import penInk from "./data/pen-ink.json";
import kenney from "./data/kenney.json";
import type { Credit } from "./types";

/** A sprite of a bundled pack, as the Library lists it. */
export interface PackStamp {
  id: string;
  name: string;
  pack: string;
  src: string;
  /** Width divided by height, for sprites that are not square. */
  aspect?: number;
  /** What the picture is (Trees, Mountains, Buildings ...), for the Library's filter. */
  category?: string;
  /** Words the Library search also matches. */
  tags?: string[];
  /** Dungeon grid squares the picture is drawn to fill: width, height. */
  cells?: [number, number];
}
export const PACK_STAMPS = [
  ...kenney,
  ...gosbell,
  ...classic,
  ...amanz,
  ...aiGen,
  ...handInked,
  ...penInk,
] as PackStamp[];

/** Whether a stamp matches a search: its name, category or one of its tags contains every word. */
export const stampMatches = (s: PackStamp, query: string) => {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const text = [s.name, s.category ?? "", ...(s.tags ?? [])]
    .join(" ")
    .toLowerCase();
  return words.every((w) => text.includes(w));
};

const count = (pack: string) =>
  PACK_STAMPS.filter((s) => s.pack === pack).length;
/** The packs the Library offers, with the credit line shown under the pictures. */
export const STAMP_PACKS = [
  {
    key: "cartography",
    label: `Kenney Cartography · ${count("cartography")}`,
    credit: "Kenney · CC0 1.0",
  },
  {
    key: "medieval",
    label: `Kenney Medieval RTS · ${count("medieval")}`,
    credit: "Kenney · CC0 1.0",
  },
  {
    key: "gosbell",
    label: `Dungeon dressing · ${count("gosbell")}`,
    credit: "Mark Gosbell · CC0 1.0",
  },
  {
    key: "classic-dungeon",
    label: `Classic dungeon symbols · ${count("classic-dungeon")}`,
    credit: "Mark Gosbell · CC0 1.0",
  },
  {
    key: "amanz-lite",
    label: `Map icons · ${count("amanz-lite")}`,
    credit: "Amanz · CC BY 4.0",
    // Placing one of its stamps adds this to the world's credits.
    attribution: {
      id: "bundled-amanz-lite",
      name: "Fantasy Map Assets Pack Lite",
      author: "Amanz (Deface Games)",
      license: "CC BY 4.0",
      url: "https://amanz.itch.io/fantasy-map-assets-pack-lite",
    } as Credit,
  },
  {
    key: "ai-gen",
    label: `AI_GEN · ${count("ai-gen")}`,
    credit: "AI generated · no third-party licence",
  },
  {
    key: "hand-inked",
    label: `Hand-inked · ${count("hand-inked")}`,
    credit: "AI generated · no third-party licence",
  },
  {
    key: "pen-ink",
    label: `Pen & ink · ${count("pen-ink")}`,
    credit: "AI generated · no third-party licence",
  },
] as {
  key: string;
  label: string;
  credit: string;
  attribution?: Credit;
}[];
