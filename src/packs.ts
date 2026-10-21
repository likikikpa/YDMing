import gosbell from "./data/gosbell.json";
import kenney from "./data/kenney.json";

/** A sprite of a bundled pack, as the Library lists it. */
export interface PackStamp {
  id: string;
  name: string;
  pack: string;
  src: string;
  /** Width divided by height, for sprites that are not square. */
  aspect?: number;
  /** Dungeon grid squares the picture is drawn to fill: width, height. */
  cells?: [number, number];
}
export const PACK_STAMPS = [...kenney, ...gosbell] as PackStamp[];

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
];
