import type { MapData } from "./types";

/** The frame, compass and scale bar drawn on a map's sheet. */
export function ornaments(ctx: CanvasRenderingContext2D, map: MapData) {
  ctx.save();
  ctx.strokeStyle = "#5e624b66";
  ctx.lineWidth = 1;
  ctx.strokeRect(15, 15, map.width - 30, map.height - 30);
  ctx.lineWidth = 0.5;
  ctx.strokeRect(20, 20, map.width - 40, map.height - 40);
  [
    [15, 15],
    [map.width - 15, 15],
    [15, map.height - 15],
    [map.width - 15, map.height - 15],
  ].forEach(([x, y]) => {
    ctx.fillStyle = "#707054";
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  if (map.kind !== "dungeon") {
    ctx.save();
    ctx.translate(map.width - 85, map.height - 92);
    ctx.fillStyle = "#5b654f";
    ctx.font = "12px Georgia";
    ctx.textAlign = "center";
    ctx.fillText("N", 0, -47);
    ctx.strokeStyle = "#5b654f";
    ctx.beginPath();
    ctx.arc(0, 0, 27, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 4);
      ctx.beginPath();
      ctx.moveTo(0, -38);
      ctx.lineTo(7, 0);
      ctx.lineTo(0, 38);
      ctx.lineTo(-7, 0);
      ctx.closePath();
      ctx.fillStyle = i % 2 ? "#dad5b8" : "#6e7458";
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    ctx.fillStyle = "#59614b";
    ctx.font = "10px Georgia";
    ctx.textAlign = "left";
    ctx.fillText(
      map.kind === "world"
        ? "0                    100                    200 miles"
        : "0                    250                    500 feet",
      45,
      map.height - 47,
    );
    ctx.beginPath();
    ctx.moveTo(45, map.height - 37);
    ctx.lineTo(230, map.height - 37);
    for (let x = 45; x <= 230; x += 92.5) {
      ctx.moveTo(x, map.height - 42);
      ctx.lineTo(x, map.height - 33);
    }
    ctx.stroke();
  }
  ctx.restore();
}
