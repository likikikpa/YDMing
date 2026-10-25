import { resolveStyle } from "./map-styles";
import { styleFont } from "./map-fonts";
import type { MapObject } from "./types";

/**
 * The average advance of a capital and of a small letter in each face, as a
 * share of the font size, measured from the font files. The generator has no
 * canvas to measure names with, so it estimates their width from these.
 */
const ADVANCE: Record<string, [number, number]> = {
  alegreya: [0.62, 0.47],
  cinzel: [0.68, 0.64],
  fell: [0.72, 0.47],
  "fell-italic": [0.69, 0.4],
  pirata: [0.42, 0.41],
  uncial: [0.79, 0.65],
  marck: [0.69, 0.43],
};

/** About how wide a label is drawn, with its face and spacing, in pixels. */
export function letteredWidth(
  o: Pick<MapObject, "name" | "height" | "font" | "spacing">,
  style: string,
) {
  const [upper, lower] =
    ADVANCE[o.font && ADVANCE[o.font] ? o.font : styleFont(style)];
  let em = 0;
  for (const c of o.name)
    em += c === " " ? 0.25 : c !== c.toLowerCase() ? upper : lower;
  const gaps = Math.max(0, Array.from(o.name).length - 1);
  return (em + (o.spacing ?? 0) * gaps) * o.height;
}

export type Lettered = "realm" | "sea" | "mountains" | "forest";

/**
 * How the generator letters a name: realms and seas in spaced capitals
 * (Cinzel, or the paper's italic in Old ink), ranges and forests a little
 * spaced in the style's own face.
 */
export function regionLettering(
  style: string,
  what: Lettered,
): Pick<MapObject, "font" | "spacing" | "height"> {
  const ink = resolveStyle(style) === "ink",
    capitals = what === "realm" || what === "sea";
  return {
    ...(capitals && !ink && { font: "cinzel" }),
    spacing: capitals ? (what === "sea" ? 0.35 : 0.25) : 0.08,
    height: what === "sea" ? 17 : what === "realm" ? 14 : 13,
  };
}

/**
 * How much a name laid along a feature should bend to follow it, as a label
 * `curve`: a range that bows upward in the middle gives an arch. `cells` are
 * the feature's grid cells, `cx`/`cy` its middle, `degrees` the tilt of the
 * name and `span` its length, both in cells.
 */
export function featureBend(
  cells: number[],
  cols: number,
  cx: number,
  cy: number,
  degrees: number,
  span: number,
) {
  if (cells.length < 8 || span <= 0) return 0;
  const a = (degrees * Math.PI) / 180,
    ux = Math.cos(a),
    uy = Math.sin(a);
  // Fit v = k·u² + c across the feature, u along the name and v across it
  // (down the page).
  let su = 0,
    sv = 0,
    suu = 0,
    suv = 0;
  for (const c of cells) {
    const dx = (c % cols) - cx,
      dy = Math.floor(c / cols) - cy,
      u = dx * ux + dy * uy,
      v = -dx * uy + dy * ux,
      q = u * u;
    su += q;
    sv += v;
    suu += q * q;
    suv += q * v;
  }
  const n = cells.length,
    spread = suu / n - (su / n) ** 2;
  if (spread <= 0) return 0;
  const k = (suv / n - (su / n) * (sv / n)) / spread;
  // An arc of the name's length whose ends drop by k·(span/2)² sweeps
  // about 2·k·span/π of a half circle.
  const curve = (2 * k * span) / Math.PI;
  if (Math.abs(curve) < 0.05) return 0;
  return Math.round(Math.max(-0.35, Math.min(0.35, curve)) * 100) / 100;
}
