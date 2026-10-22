import { resolveStyle } from "./map-styles";

/** How a style shades the land from the terrain heights, with the light in the north-west. */
export interface Relief {
  /** Strength of the shade from the slope across one cell. */
  fine: number;
  /** Strength of the shade from the slope across several cells, which shows the shape of a range. */
  broad: number;
  /** Extra strength on high ground: 0 for none, 1 doubles it on the highest. */
  highland: number;
  /** How much of the shade each colour channel takes: lit ground warm, shadow cool. */
  tint: [number, number, number];
  /** Cells away that still change a cell's shade, so an edit knows how far to repaint. */
  reach: number;
}

const FANTASY: Relief = {
  fine: 260,
  broad: 150,
  highland: 1.2,
  tint: [1, 0.96, 0.84],
  reach: 3,
};

/** A gentler wash in sepia: lit paper stays pale, shade turns brown. */
const INK: Relief = {
  fine: 170,
  broad: 120,
  highland: 0.9,
  tint: [1, 0.9, 0.7],
  reach: 3,
};

/** The relief a style draws, or null for the faint diagonal shade Parchment and Atlas use. */
export const reliefOf = (style: string): Relief | null => {
  const id = resolveStyle(style);
  return id === "fantasy" ? FANTASY : id === "ink" ? INK : null;
};

/** Light or shade, in colour levels, of the land in cell `x, y`: positive where the ground faces the light. */
export function shadeAt(
  heights: ArrayLike<number>,
  cols: number,
  rows: number,
  x: number,
  y: number,
  relief: Relief,
) {
  const at = (cx: number, cy: number) =>
      heights[
        Math.min(rows - 1, Math.max(0, cy)) * cols +
          Math.min(cols - 1, Math.max(0, cx))
      ],
    fine = (at(x + 1, y) - at(x - 1, y) + at(x, y + 1) - at(x, y - 1)) / 2,
    broad = (at(x + 3, y) - at(x - 3, y) + at(x, y + 3) - at(x, y - 3)) / 6,
    height = Math.min(1, Math.max(0, (at(x, y) - 0.55) / 0.3)),
    shade =
      (relief.fine * fine + relief.broad * broad) *
      (1 + relief.highland * height);
  return Math.max(-40, Math.min(40, shade));
}
