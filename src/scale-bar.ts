import type { MapKind } from "./types";

/** Where the scale bar starts and ends on the sheet, in map pixels from the left edge. */
export const SCALE_START = 45;
export const SCALE_END = 230;

/** The labels of a scale bar: the number at each tick, and the unit after the last. */
export interface ScaleBar {
  numbers: string[];
  unit: string;
}

/** The scale bar of a kind of map; dungeons have none. */
export function scaleBar(kind: MapKind): ScaleBar | undefined {
  if (kind === "dungeon") return undefined;
  return kind === "world"
    ? { numbers: ["0", "100", "200"], unit: "miles" }
    : { numbers: ["0", "250", "500"], unit: "feet" };
}

/** Left edge of each tick, evenly spaced from the start of the bar to its end. */
export const tickPositions = (count: number) =>
  Array.from(
    { length: count },
    (_, i) => SCALE_START + ((SCALE_END - SCALE_START) * i) / (count - 1),
  );

/** Draws the scale bar with each number centred over its own tick. */
export function drawScaleBar(
  ctx: CanvasRenderingContext2D,
  height: number,
  bar: ScaleBar,
  colours: { text: string; line: string; lineWidth: number; halo?: string },
) {
  const ticks = tickPositions(bar.numbers.length),
    labelY = height - 47,
    lineY = height - 37;
  ctx.save();
  ctx.font = "10px Georgia";
  ctx.textAlign = "center";
  const label = (text: string, x: number, align: CanvasTextAlign) => {
    ctx.textAlign = align;
    if (colours.halo) {
      ctx.strokeStyle = colours.halo;
      ctx.lineWidth = 3;
      ctx.lineJoin = "round";
      ctx.strokeText(text, x, labelY);
    }
    ctx.fillStyle = colours.text;
    ctx.fillText(text, x, labelY);
  };
  bar.numbers.forEach((n, i) => label(n, ticks[i], "center"));
  const last = bar.numbers.length - 1;
  label(
    bar.unit,
    ticks[last] + ctx.measureText(bar.numbers[last]).width / 2 + 4,
    "left",
  );
  ctx.strokeStyle = colours.line;
  ctx.lineWidth = colours.lineWidth;
  ctx.beginPath();
  ctx.moveTo(SCALE_START, lineY);
  ctx.lineTo(SCALE_END, lineY);
  for (const x of ticks) {
    ctx.moveTo(x, lineY - 5);
    ctx.lineTo(x, lineY + 4);
  }
  ctx.stroke();
  ctx.restore();
}
