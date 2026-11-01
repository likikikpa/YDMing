import { resolveStyle } from "./map-styles";

/** A line drawn along a height contour near the shore. */
export interface CoastLine {
  /** Added to the sea level: 0 is the shore, below it is out in the water. */
  offset: number;
  colour: string;
  width: number;
}

/** A strong ink shore and water lining that fades out to sea, as drawn on old charts. */
const INK: CoastLine[] = [
  { offset: 0, colour: "#3f2f1fe0", width: 1.5 },
  { offset: -0.012, colour: "#5a4630a8", width: 0.8 },
  { offset: -0.026, colour: "#5a463090", width: 0.75 },
  { offset: -0.044, colour: "#5a463070", width: 0.7 },
  { offset: -0.066, colour: "#5a463050", width: 0.65 },
  { offset: -0.092, colour: "#5a463036", width: 0.6 },
];

/** A soft dark edge against the land, a foam line, and ripples fading out to sea. */
const PAINTED: CoastLine[] = [
  { offset: 0, colour: "#2f6270b0", width: 1.5 },
  { offset: -0.012, colour: "#f4fbf6aa", width: 1.3 },
  { offset: -0.04, colour: "#e3f6f666", width: 0.9 },
  { offset: -0.075, colour: "#e3f6f644", width: 0.8 },
];

/** A thin line of surf at the shore and one soft band of foam just beyond it: the depth shows in the water's colour, not in lines. */
const REALISTIC: CoastLine[] = [
  { offset: 0, colour: "#f6faf5b0", width: 1.1 },
  { offset: -0.018, colour: "#f6faf530", width: 3 },
];

const COASTS = { fantasy: PAINTED, ink: INK, realistic: REALISTIC };

/** The lines a style draws along its coasts, from the shore outwards. */
export const coastLines = (style: string): CoastLine[] =>
  COASTS[resolveStyle(style)];

/** How far below the sea level the deepest line of any style is drawn. */
export const DEEPEST_COAST_LINE = Math.max(
  ...[INK, PAINTED, REALISTIC].flatMap((lines) => lines.map((l) => -l.offset)),
);
