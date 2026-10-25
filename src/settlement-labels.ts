import { mapFont } from "./map-fonts";
import type { MapObject } from "./types";

/** Writes the name of each city, village and dungeon under its symbol. */
export function drawSettlementNames(
  ctx: CanvasRenderingContext2D,
  objects: MapObject[],
  inClip: (o: MapObject) => boolean,
  style: string,
) {
  objects
    .filter((o) => ["city", "village", "dungeon"].includes(o.kind) && inClip(o))
    .forEach((o) => {
      ctx.font = mapFont(
        undefined,
        o.kind === "city" ? 12 : 10,
        style,
        o.kind === "city",
      );
      ctx.textAlign = "center";
      ctx.strokeStyle = "#e8e3cb";
      ctx.lineWidth = 3;
      ctx.strokeText(o.name, o.x, o.y + o.height / 2 + 13);
      ctx.fillStyle = "#434837";
      ctx.fillText(o.name, o.x, o.y + o.height / 2 + 13);
    });
}
