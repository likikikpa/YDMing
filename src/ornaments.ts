import { resolveStyle } from "./map-styles";
import { drawScaleBar, scaleBar } from "./scale-bar";
import type { MapData } from "./types";

/** The colours and line weights of the frame, compass and scale bar. */
interface Ornaments {
  frame: string;
  outerWidth: number;
  innerWidth: number;
  dot: string;
  dotRadius: number;
  compassText: string;
  compassLine: string;
  compassLineWidth: number;
  compassDark: string;
  compassLight: string;
  /** Drawn behind the letters so they read on any ground; none for the inked styles. */
  halo?: string;
  scale: { text: string; line: string; lineWidth: number };
}

/** Ink on paper: thin olive lines, as every style drew before styles had their own. */
const INKED: Ornaments = {
  frame: "#5e624b66",
  outerWidth: 1,
  innerWidth: 0.5,
  dot: "#707054",
  dotRadius: 3,
  compassText: "#5b654f",
  compassLine: "#5b654f",
  compassLineWidth: 0.5,
  compassDark: "#6e7458",
  compassLight: "#dad5b8",
  scale: { text: "#59614b", line: "#5e624b66", lineWidth: 0.5 },
};

/** Cream and gold with dark teal outlines: legible on a deep sea. */
const PAINTED: Ornaments = {
  frame: "#f0e6c8c0",
  outerWidth: 1.6,
  innerWidth: 0.7,
  dot: "#f0e6c8",
  dotRadius: 3.5,
  compassText: "#f6efd8",
  compassLine: "#1f4658",
  compassLineWidth: 0.9,
  compassDark: "#c79a4e",
  compassLight: "#f1e7c6",
  halo: "#12303f99",
  scale: { text: "#f6efd8", line: "#f0e6c8cc", lineWidth: 1 },
};

/** The frame, compass and scale bar drawn on a map's sheet. */
export function ornaments(ctx: CanvasRenderingContext2D, map: MapData) {
  const o = resolveStyle(map.settings.style) === "fantasy" ? PAINTED : INKED;
  ctx.save();
  ctx.strokeStyle = o.frame;
  ctx.lineWidth = o.outerWidth;
  ctx.strokeRect(15, 15, map.width - 30, map.height - 30);
  ctx.lineWidth = o.innerWidth;
  ctx.strokeRect(20, 20, map.width - 40, map.height - 40);
  [
    [15, 15],
    [map.width - 15, 15],
    [15, map.height - 15],
    [map.width - 15, map.height - 15],
  ].forEach(([x, y]) => {
    ctx.fillStyle = o.dot;
    ctx.beginPath();
    ctx.arc(x, y, o.dotRadius, 0, Math.PI * 2);
    ctx.fill();
  });
  if (map.kind !== "dungeon") {
    ctx.save();
    ctx.translate(map.width - 85, map.height - 92);
    ctx.font = "12px Georgia";
    ctx.textAlign = "center";
    if (o.halo) {
      ctx.strokeStyle = o.halo;
      ctx.lineWidth = 3;
      ctx.lineJoin = "round";
      ctx.strokeText("N", 0, -47);
    }
    ctx.fillStyle = o.compassText;
    ctx.fillText("N", 0, -47);
    ctx.strokeStyle = o.compassLine;
    ctx.lineWidth = o.compassLineWidth;
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
      ctx.fillStyle = i % 2 ? o.compassLight : o.compassDark;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    const bar = scaleBar(map.kind);
    if (bar) drawScaleBar(ctx, map.height, bar, { ...o.scale, halo: o.halo });
  }
  ctx.restore();
}
