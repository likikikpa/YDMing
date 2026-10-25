import { layoutLine, lettersOf } from "./curved-text";
import { resolveStyle } from "./map-styles";
import { mapFont } from "./map-fonts";
import type { MapObject } from "./types";

/** Draws a label centred on the origin of the transformed context. */
export function drawLabel(
  ctx: CanvasRenderingContext2D,
  o: MapObject,
  style: string,
) {
  const ink = resolveStyle(style) === "ink";
  ctx.font = mapFont(o.font, o.height, style);
  ctx.textAlign = "center";
  // A light halo keeps names readable over dark water and busy ground.
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(2, o.height * 0.28);
  ctx.strokeStyle = ink
    ? "rgba(238, 227, 196, 0.8)"
    : "rgba(244, 236, 212, 0.85)";
  ctx.fillStyle = o.color;
  const spacing = (o.spacing ?? 0) * o.height,
    curve = o.curve ?? 0;
  if (!spacing && !curve) {
    ctx.strokeText(o.name, 0, 0, o.width);
    ctx.fillText(o.name, 0, 0, o.width);
    return;
  }
  const letters = lettersOf(o.name),
    advances = [0];
  let prefix = "";
  for (const l of letters) {
    prefix += l;
    advances.push(ctx.measureText(prefix).width);
  }
  const { glyphs, squeeze } = layoutLine(
    letters,
    advances,
    spacing,
    curve,
    o.width,
  );
  // Every halo first, so no letter's halo covers its neighbour.
  for (const pass of ["stroke", "fill"] as const)
    for (const g of glyphs) {
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.angle);
      if (squeeze < 1) ctx.scale(squeeze, 1);
      if (pass === "stroke") ctx.strokeText(g.text, 0, 0);
      else ctx.fillText(g.text, 0, 0);
      ctx.restore();
    }
}

let measurer: CanvasRenderingContext2D | null | undefined;
/** How wide a label is lettered in its face and spacing, before any squeeze. */
export function labelWidth(o: MapObject, style: string) {
  measurer ??= document.createElement("canvas").getContext("2d");
  if (!measurer) return o.width;
  measurer.font = mapFont(o.font, o.height, style);
  const gaps = Math.max(0, lettersOf(o.name).length - 1);
  return (
    measurer.measureText(o.name).width + (o.spacing ?? 0) * o.height * gaps
  );
}
