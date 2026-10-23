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
  /** Drawn behind the letters so they read on any ground; none for Old ink. */
  halo?: string;
  /** Red, green, blue and strongest alpha of a tint that darkens the sheet towards its edges, like old paper. */
  edge?: [number, number, number, number];
  scale: { text: string; line: string; lineWidth: number };
}

/** Sepia ink on aged paper: a heavier frame, brown-black lines, darker edges. */
const INK: Ornaments = {
  frame: "#4a3826c8",
  outerWidth: 1.5,
  innerWidth: 0.6,
  dot: "#4a3826",
  dotRadius: 3,
  compassText: "#3f2f1f",
  compassLine: "#3f2f1f",
  compassLineWidth: 0.8,
  compassDark: "#4a3826",
  compassLight: "#efe2bf",
  scale: { text: "#3f2f1f", line: "#4a3826cc", lineWidth: 0.8 },
  edge: [110, 72, 28, 0.34],
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

/** Darkens the sheet towards its corners and edges. */
function agedEdge(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  [r, g, b, alpha]: [number, number, number, number],
) {
  const gradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.4,
    width / 2,
    height / 2,
    Math.hypot(width, height) / 2,
  );
  gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
  gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${alpha})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

/** The frame, compass and scale bar drawn on a map's sheet. */
export function ornaments(ctx: CanvasRenderingContext2D, map: MapData) {
  const o = resolveStyle(map.settings.style) === "ink" ? INK : PAINTED;
  ctx.save();
  // A dungeon is stone, not paper.
  if (o.edge && map.kind !== "dungeon")
    agedEdge(ctx, map.width, map.height, o.edge);
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
