import { resolveStyle } from "./map-styles";
import type { MapObject } from "./types";

/** Draws a label centred on the origin of the transformed context. */
export function drawLabel(
  ctx: CanvasRenderingContext2D,
  o: MapObject,
  style: string,
) {
  const id = resolveStyle(style);
  // Old charts letter their names in italic.
  ctx.font = `${id === "ink" ? "italic " : ""}${o.height}px Georgia, serif`;
  ctx.textAlign = "center";
  if (id === "fantasy" || id === "ink") {
    // A light halo keeps names readable over dark water and busy ground.
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(2, o.height * 0.28);
    ctx.strokeStyle =
      id === "ink" ? "rgba(238, 227, 196, 0.8)" : "rgba(244, 236, 212, 0.85)";
    ctx.strokeText(o.name, 0, 0, o.width);
  }
  ctx.fillStyle = o.color;
  ctx.fillText(o.name, 0, 0, o.width);
}
