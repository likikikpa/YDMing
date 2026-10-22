import type { MapStyleId } from "./types";

/** How a map looks, and which stamp collection goes with that look. */
export interface MapStyle {
  id: MapStyleId;
  /** English name; pass it through `t()` where it is shown. */
  label: string;
  /** What the image search server calls the look: it ranks coloured or inked pictures by it. */
  search: "parchment" | "atlas" | "painted";
  /** Key of the Library collection whose pictures match this style. */
  stampPack?: string;
}

export const MAP_STYLES: Record<MapStyleId, MapStyle> = {
  parchment: { id: "parchment", label: "Parchment", search: "parchment" },
  atlas: { id: "atlas", label: "Atlas", search: "atlas" },
  painted: { id: "painted", label: "Painted", search: "painted" },
  fantasy: {
    id: "fantasy",
    label: "Painted fantasy",
    search: "painted",
    stampPack: "ai-gen",
  },
};

/**
 * Styles that no longer exist. A map saved with one is drawn in its
 * replacement, so old saves and `.ydming` files keep loading.
 */
export const RETIRED_STYLES: Partial<Record<MapStyleId, MapStyleId>> = {
  painted: "fantasy",
};

/** The styles the picker offers, in order. */
export const PICKER_STYLES: MapStyleId[] = ["fantasy", "parchment", "atlas"];

/** The style a map is drawn in. Anything unknown draws as Atlas, as it always did. */
export function resolveStyle(id: string | undefined): MapStyleId {
  const known = id !== undefined && Object.hasOwn(MAP_STYLES, id);
  const style = known ? (id as MapStyleId) : "atlas";
  return RETIRED_STYLES[style] ?? style;
}

/** The style a map's settings name, with retired styles replaced. */
export const styleOf = (settings: { style: string }): MapStyle =>
  MAP_STYLES[resolveStyle(settings.style)];
