import { resolveStyle } from "./map-styles";

/** A line drawn along a height contour near the shore. */
export interface CoastLine {
  /** Added to the sea level: 0 is the shore, below it is out in the water. */
  offset: number;
  colour: string;
  width: number;
}

/** A thin dark shore line with two faint rings of shallows, as every style drew before. */
const INKED: CoastLine[] = [
  { offset: 0, colour: "#657c69", width: 1.1 },
  { offset: -0.015, colour: "#93aaa1", width: 0.65 },
  { offset: -0.035, colour: "#aabbb0", width: 0.6 },
];

/** A soft dark edge against the land, a foam line, and ripples fading out to sea. */
const PAINTED: CoastLine[] = [
  { offset: 0, colour: "#2f6270b0", width: 1.5 },
  { offset: -0.012, colour: "#f4fbf6aa", width: 1.3 },
  { offset: -0.04, colour: "#e3f6f666", width: 0.9 },
  { offset: -0.075, colour: "#e3f6f644", width: 0.8 },
];

/** The lines a style draws along its coasts, from the shore outwards. */
export const coastLines = (style: string): CoastLine[] =>
  resolveStyle(style) === "fantasy" ? PAINTED : INKED;
