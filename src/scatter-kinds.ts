import { PACK_STAMPS, STAMP_PACKS } from "./packs";
import type { PackStamp } from "./packs";
import type { ScatterPicture } from "./scatter";
import type { StampSprite } from "./stamp-brush";

/** A group of Library pictures the scatter brush draws from together. */
export interface ScatterKind {
  key: string;
  label: string;
  /** Matches the picture's file name; the first kind that matches owns it. */
  match: RegExp;
  /** The largest turn that looks right, in degrees: rocks any way up, trees upright. */
  turn: number;
}

export const SCATTER_KINDS: readonly ScatterKind[] = [
  {
    key: "mountains",
    label: "Mountains",
    match:
      /^(peak|range|hills|ridge|mesa|butte|volcano|vulcano|rocksMountain)/i,
    turn: 0,
  },
  { key: "trees", label: "Trees", match: /^(tree|palm)/i, turn: 0 },
  {
    key: "rocks",
    label: "Rocks",
    match: /^(boulders|rocks|forest-moss-rock)/i,
    turn: 180,
  },
  {
    key: "undergrowth",
    label: "Undergrowth",
    match: /^(bush|cactus|forest-(bush|bramble|mushrooms|roots|log))/i,
    turn: 20,
  },
];

const fileName = (src: string) => src.slice(src.lastIndexOf("/") + 1);

/** The kind a bundled picture belongs to, from its file name. */
export const kindOf = (src: string): ScatterKind | undefined =>
  src.startsWith("data:")
    ? undefined
    : SCATTER_KINDS.find((k) => k.match.test(fileName(src)));

/** A Library picture as the stamp tool holds it, with its credit. */
export const packSprite = (a: PackStamp): StampSprite => ({
  src: a.src,
  name: a.name,
  aspect: a.aspect,
  cells: a.cells,
  credit: STAMP_PACKS.find((p) => p.key === a.pack)?.attribution,
});

/** Every picture of the kind in one collection. */
export const kindPictures = (pack: string, kind: string): ScatterPicture[] =>
  PACK_STAMPS.filter((a) => a.pack === pack && kindOf(a.src)?.key === kind).map(
    (a) => ({ sprite: packSprite(a), turn: kindOf(a.src)?.turn }),
  );

/** The kinds a collection has pictures for. */
export const packKinds = (pack: string): ScatterKind[] =>
  SCATTER_KINDS.filter((k) => kindPictures(pack, k.key).length > 0);
