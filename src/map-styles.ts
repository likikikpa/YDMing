import type { MapStyleId } from "./types";

/** The styles that exist. Saved maps may name a retired one: see `RETIRED_STYLES`. */
export type LiveStyleId = "fantasy" | "ink" | "realistic" | "drawn" | "pen";

/** How a map looks, and which stamp collection goes with that look. */
export interface MapStyle {
  id: LiveStyleId;
  /** English name; pass it through `t()` where it is shown. */
  label: string;
  /** What the image search server calls the look: it ranks coloured or inked pictures by it. */
  search: "parchment" | "painted";
  /** Key of the Library collection whose pictures match this style. */
  stampPack?: string;
}

export const MAP_STYLES: Record<LiveStyleId, MapStyle> = {
  ink: {
    id: "ink",
    label: "Old ink",
    search: "parchment",
    stampPack: "cartography",
  },
  fantasy: {
    id: "fantasy",
    label: "Painted fantasy",
    search: "painted",
    stampPack: "ai-gen",
  },
  // Inked and washed pictures on a calm painted ground: trees, peaks and buildings are drawn stamps.
  drawn: {
    id: "drawn",
    label: "Hand-drawn",
    search: "painted",
    stampPack: "hand-inked",
  },
  // Black ink on white paper, for printing without colour: no tint anywhere on the map.
  pen: {
    id: "pen",
    label: "Pen & ink",
    search: "parchment",
    stampPack: "pen-ink",
  },
  // Relief and woods come from the terrain, so it has no stamp collection of its own.
  realistic: { id: "realistic", label: "Realistic", search: "painted" },
};

/**
 * Styles that no longer exist. A map saved with one is drawn in its
 * replacement, so old saves and `.ydming` files keep loading.
 */
export const RETIRED_STYLES: Partial<Record<MapStyleId, LiveStyleId>> = {
  painted: "fantasy",
  parchment: "ink",
  atlas: "fantasy",
};

/** The styles the picker offers, in order. */
export const PICKER_STYLES: LiveStyleId[] = [
  "fantasy",
  "drawn",
  "pen",
  "ink",
  "realistic",
];

/**
 * The style a map is drawn in: a retired one is replaced by its successor,
 * and anything unknown draws as Painted fantasy, the default.
 */
export function resolveStyle(id: string | undefined): LiveStyleId {
  if (id === undefined) return "fantasy";
  if (Object.hasOwn(MAP_STYLES, id)) return id as LiveStyleId;
  if (Object.hasOwn(RETIRED_STYLES, id))
    return RETIRED_STYLES[id as MapStyleId]!;
  return "fantasy";
}

/** The style a map's settings name, with retired styles replaced. */
export const styleOf = (settings: { style: string }): MapStyle =>
  MAP_STYLES[resolveStyle(settings.style)];

/** Styles drawn as ink on paper: calm ground, italic names, flat deep water. */
export const isInkStyle = (style: string | undefined) => {
  const id = resolveStyle(style);
  return id === "ink" || id === "pen";
};
