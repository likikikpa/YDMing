import { resolveStyle } from "./map-styles";
import { tone } from "./style-tone";
import type { MapObject } from "./types";

/** Writes the name of each city, village and dungeon under its symbol. */
export function drawSettlementNames(
  ctx: CanvasRenderingContext2D,
  objects: MapObject[],
  inClip: (o: MapObject) => boolean,
  style = "",
) {
  const halo = resolveStyle(style) === "pen" ? "#ffffff" : "#e8e3cb";
  objects
    .filter((o) => ["city", "village", "dungeon"].includes(o.kind) && inClip(o))
    .forEach((o) => {
      ctx.font = `${o.kind === "city" ? "bold 12" : "10"}px Georgia`;
      ctx.textAlign = "center";
      ctx.strokeStyle = halo;
      ctx.lineWidth = 3;
      ctx.strokeText(o.name, o.x, o.y + o.height / 2 + 13);
      ctx.fillStyle = tone(style, "#434837");
      ctx.fillText(o.name, o.x, o.y + o.height / 2 + 13);
    });
}
