import { floodFill } from "./flood";
import { terrainView } from "./terrain";
import { biomeAt } from "./generator";
import { clamp, hash, noise, random } from "./random";
import type { MapData, MapObject, MapPath, StampKind, Stroke } from "./types";
export interface RenderOptions {
  player?: boolean;
  contours?: boolean;
  grid?: boolean;
  transparent?: boolean;
  ornaments?: boolean;
}
const terrainCache = new WeakMap<number[], HTMLCanvasElement>();
const imageCache = new Map<string, HTMLImageElement>();
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const known = imageCache.get(src);
    if (known?.complete) {
      resolve(known);
      return;
    }
    const image = new Image();
    image.onload = () => {
      imageCache.set(src, image);
      resolve(image);
    };
    image.onerror = reject;
    image.src = src;
  });
}
const parchment = [
  [234, 232, 215],
  [226, 225, 213],
  [168, 164, 139],
  [183, 187, 159],
  [151, 165, 130],
  [190, 197, 151],
  [140, 159, 113],
  [142, 164, 139],
  [215, 198, 150],
  [191, 192, 128],
  [122, 153, 106],
  [222, 214, 178],
  [190, 210, 207],
];
const painted = [
  [238, 244, 235],
  [206, 210, 193],
  [136, 147, 129],
  [169, 185, 152],
  [91, 139, 103],
  [148, 181, 109],
  [64, 127, 83],
  [69, 143, 117],
  [223, 194, 119],
  [181, 190, 99],
  [42, 117, 76],
  [224, 214, 162],
  [62, 122, 150],
];
const atlas = [
  [241, 244, 236],
  [192, 188, 168],
  [142, 146, 123],
  [160, 176, 146],
  [111, 146, 117],
  [164, 184, 127],
  [99, 146, 106],
  [99, 152, 134],
  [217, 196, 140],
  [180, 187, 119],
  [78, 138, 103],
  [218, 214, 175],
  [94, 149, 164],
];
function terrainTexture(map: MapData) {
  const cached = terrainCache.get(map.heights);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = map.cols * 3;
  canvas.height = map.rows * 3;
  const ctx = canvas.getContext("2d")!,
    img = ctx.createImageData(canvas.width, canvas.height),
    palette =
      map.settings.style === "parchment"
        ? parchment
        : map.settings.style === "painted"
          ? painted
          : atlas,
    seed = hash(map.settings.seed);
  const colors = map.heights.map(
    (_, i) =>
      palette[biomeAt(map, i % map.cols, Math.floor(i / map.cols))] ||
      palette[5],
  );
  for (let py = 0; py < canvas.height; py++)
    for (let px = 0; px < canvas.width; px++) {
      const x = Math.min(map.cols - 2, px / 3),
        y = Math.min(map.rows - 2, py / 3),
        ix = Math.floor(x),
        iy = Math.floor(y),
        fx = x - ix,
        fy = y - iy,
        i = iy * map.cols + ix,
        water = map.heights[i] < map.settings.seaLevel;
      const a = colors[i],
        b = colors[i + 1],
        c = colors[i + map.cols],
        d = colors[i + map.cols + 1];
      const slope =
        (map.heights[Math.max(0, i - map.cols - 1)] -
          map.heights[Math.min(map.heights.length - 1, i + map.cols + 1)]) *
        65;
      let shade = water
        ? noise(px / 8, py / 8, seed) * 3 - 1
        : slope + noise(px, py, seed) * 7 - 3;
      const depth = water
        ? clamp((map.settings.seaLevel - map.heights[i]) * 10)
        : 0;
      const p = (py * canvas.width + px) * 4;
      for (let k = 0; k < 3; k++) {
        const color =
          (a[k] * (1 - fx) + b[k] * fx) * (1 - fy) +
          (c[k] * (1 - fx) + d[k] * fx) * fy;
        img.data[p + k] = clamp(
          color + shade - depth * (map.settings.style === "parchment" ? 3 : 10),
          0,
          255,
        );
      }
      img.data[p + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  terrainCache.set(map.heights, canvas);
  return canvas;
}
function path(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  close = false,
) {
  if (!points.length) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  if (close) ctx.closePath();
}
function drawLandscape(
  ctx: CanvasRenderingContext2D,
  map: MapData,
  contours = false,
) {
  ctx.drawImage(terrainTexture(map), 0, 0, map.width, map.height);
  coast(ctx, map, map.settings.seaLevel, "#657c69", 1.1);
  coast(ctx, map, map.settings.seaLevel - 0.015, "#93aaa1", 0.65);
  coast(ctx, map, map.settings.seaLevel - 0.035, "#aabbb0", 0.6);
  if (contours)
    for (let h = map.settings.seaLevel + 0.07; h < 1; h += 0.055)
      coast(ctx, map, h, "#6d725d44", 0.7);
}
function coast(
  ctx: CanvasRenderingContext2D,
  map: MapData,
  level: number,
  color: string,
  width: number,
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  const sx = map.width / map.cols,
    sy = map.height / map.rows;
  for (let y = 0; y < map.rows - 1; y++)
    for (let x = 0; x < map.cols - 1; x++) {
      const i = y * map.cols + x,
        values = [
          map.heights[i],
          map.heights[i + 1],
          map.heights[i + map.cols + 1],
          map.heights[i + map.cols],
        ],
        corners = [
          [x, y],
          [x + 1, y],
          [x + 1, y + 1],
          [x, y + 1],
        ],
        crossings: number[][] = [];
      for (let edge = 0; edge < 4; edge++) {
        const next = (edge + 1) % 4;
        if (values[edge] >= level === values[next] >= level) continue;
        const t = (level - values[edge]) / (values[next] - values[edge]);
        crossings.push([
          (corners[edge][0] + (corners[next][0] - corners[edge][0]) * t) * sx,
          (corners[edge][1] + (corners[next][1] - corners[edge][1]) * t) * sy,
        ]);
      }
      for (let n = 1; n < crossings.length; n += 2) {
        ctx.moveTo(crossings[n - 1][0], crossings[n - 1][1]);
        ctx.lineTo(crossings[n][0], crossings[n][1]);
      }
    }
  ctx.stroke();
}
function smoothPath(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
) {
  if (!points.length) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i],
      b = points[i + 1];
    ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
  }
  const last = points.at(-1)!;
  ctx.lineTo(last.x, last.y);
}

export function drawStamp(
  ctx: CanvasRenderingContext2D,
  kind: StampKind,
  w: number,
  h: number,
  color = "#494d37",
  variant = 0,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = "#e2d9b9";
  ctx.lineWidth = 1.25;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const p = (pts: number[][], fill = true) => {
    path(
      ctx,
      pts.map(([x, y]) => ({ x: x * w, y: y * h })),
      true,
    );
    if (fill) ctx.fill();
    ctx.stroke();
  };
  if (kind === "mountain" || kind === "hill") {
    p([
      [-0.5, 0.4],
      [-0.12, -0.5],
      [0.04, -0.32],
      [0.13, -0.43],
      [0.5, 0.4],
    ]);
    ctx.fillStyle = "#a9ab86";
    p(
      [
        [-0.12, -0.5],
        [0.04, -0.32],
        [0.13, -0.43],
        [0.5, 0.4],
        [0.12, 0.2],
      ],
      true,
    );
    ctx.fillStyle = "#f5eedb";
    p(
      [
        [-0.27, -0.15],
        [-0.12, -0.5],
        [0.04, -0.32],
        [0.13, -0.43],
        [0.22, -0.18],
        [0.08, -0.2],
        [-0.03, -0.1],
        [-0.1, -0.22],
      ],
      true,
    );
  } else if (kind === "pine" || kind === "tree") {
    ctx.fillStyle = kind === "pine" ? "#6f8258" : "#8a9b68";
    if (kind === "pine") {
      p([
        [0, -0.5],
        [-0.23, -0.12],
        [-0.12, -0.12],
        [-0.38, 0.17],
        [-0.22, 0.17],
        [-0.5, 0.4],
        [0.5, 0.4],
        [0.22, 0.17],
        [0.38, 0.17],
        [0.12, -0.12],
        [0.23, -0.12],
      ]);
    } else {
      ctx.beginPath();
      ctx.moveTo(-w * 0.1, h * 0.3);
      ctx.bezierCurveTo(
        -w * 0.7,
        h * 0.2,
        -w * 0.45,
        -h * 0.4,
        -w * 0.2,
        -h * 0.3,
      );
      ctx.bezierCurveTo(
        -w * 0.1,
        -h * 0.65,
        w * 0.3,
        -h * 0.55,
        w * 0.32,
        -h * 0.25,
      );
      ctx.bezierCurveTo(
        w * 0.65,
        -h * 0.15,
        w * 0.4,
        h * 0.3,
        w * 0.1,
        h * 0.3,
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0, h * 0.1);
    ctx.lineTo(0, h * 0.5);
    ctx.stroke();
  } else if (["city", "castle", "tower", "dungeon"].includes(kind)) {
    ctx.fillStyle = kind === "dungeon" ? "#8c7c69" : "#dbd1ae";
    ctx.fillRect(-w * 0.32, -h * 0.2, w * 0.64, h * 0.65);
    ctx.strokeRect(-w * 0.32, -h * 0.2, w * 0.64, h * 0.65);
    [-0.38, 0.18].forEach((x) => {
      ctx.fillRect(x * w, -h * 0.4, w * 0.2, h * 0.85);
      ctx.strokeRect(x * w, -h * 0.4, w * 0.2, h * 0.85);
      for (let k = 0; k < 3; k++) {
        ctx.fillRect((x + k * 0.075) * w, -h * 0.5, w * 0.05, h * 0.15);
        ctx.strokeRect((x + k * 0.075) * w, -h * 0.5, w * 0.05, h * 0.15);
      }
    });
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, h * 0.23, w * 0.1, Math.PI, 0);
    ctx.lineTo(w * 0.1, h * 0.45);
    ctx.lineTo(-w * 0.1, h * 0.45);
    ctx.closePath();
    ctx.fill();
    if (kind === "city" || kind === "castle") {
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.2);
      ctx.lineTo(0, -h * 0.7);
      ctx.lineTo(w * 0.25, -h * 0.6);
      ctx.lineTo(0, -h * 0.48);
      ctx.stroke();
    }
  } else if (["house", "village", "tavern", "temple"].includes(kind)) {
    const roof = ["#967052", "#7c6e50", "#a2825b"][variant % 3];
    ctx.fillStyle = "#e5d5ab";
    ctx.fillRect(-w * 0.4, -h * 0.15, w * 0.8, h * 0.6);
    ctx.strokeRect(-w * 0.4, -h * 0.15, w * 0.8, h * 0.6);
    ctx.fillStyle = roof;
    p(
      [
        [-0.5, -0.13],
        [0, -0.55],
        [0.5, -0.13],
      ],
      true,
    );
    ctx.fillStyle = color;
    ctx.fillRect(-w * 0.08, h * 0.15, w * 0.17, h * 0.3);
    ctx.strokeRect(-w * 0.28, h * 0.04, w * 0.13, h * 0.13);
    if (kind === "temple") {
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.5);
      ctx.lineTo(0, -h * 0.8);
      ctx.moveTo(-w * 0.12, -h * 0.69);
      ctx.lineTo(w * 0.12, -h * 0.69);
      ctx.stroke();
    }
  } else if (kind === "chest") {
    ctx.fillStyle = "#a08450";
    ctx.fillRect(-w * 0.5, -h * 0.3, w, h * 0.7);
    ctx.strokeRect(-w * 0.5, -h * 0.3, w, h * 0.7);
    ctx.strokeRect(-w * 0.15, -h * 0.35, w * 0.3, h * 0.8);
    ctx.beginPath();
    ctx.moveTo(-w * 0.5, 0);
    ctx.lineTo(w * 0.5, 0);
    ctx.stroke();
  } else if (kind === "door" || kind === "secret") {
    ctx.fillStyle = "#ad8959";
    ctx.fillRect(-w * 0.5, -h * 0.2, w, h * 0.4);
    ctx.strokeRect(-w * 0.5, -h * 0.2, w, h * 0.4);
    if (kind === "secret") {
      ctx.font = `bold ${h}px Georgia`;
      ctx.textAlign = "center";
      ctx.fillStyle = "#874d3f";
      ctx.fillText("S", 0, h * 0.3);
    }
  } else if (kind === "trap") {
    ctx.strokeStyle = "#985b48";
    p(
      [
        [0, -0.5],
        [0.5, 0.4],
        [-0.5, 0.4],
      ],
      false,
    );
    ctx.fillStyle = "#985b48";
    ctx.font = `bold ${h * 0.7}px Georgia`;
    ctx.textAlign = "center";
    ctx.fillText("!", 0, h * 0.25);
  } else if (kind === "stairs") {
    for (let n = 0; n < 5; n++) {
      ctx.beginPath();
      ctx.moveTo(-w * 0.45 + n * w * 0.08, -h * 0.4 + n * h * 0.2);
      ctx.lineTo(w * 0.45, -h * 0.4 + n * h * 0.2);
      ctx.stroke();
    }
  } else if (kind === "pillar" || kind === "well") {
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.4, h * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.25, h * 0.25, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    p(
      [
        [-0.5, 0.3],
        [-0.3, -0.3],
        [0.1, -0.45],
        [0.5, 0],
        [0.35, 0.4],
      ],
      true,
    );
  }
  ctx.restore();
}
export function stampSvg(kind: StampKind) {
  const bodies: Partial<Record<StampKind, string>> = {
    mountain:
      '<path d="M4 30 19 5l9 16 5-8 12 17H4Z"/><path d="m14 14 5 4 4-4m6 8 4 2 3-2"/>',
    tree: '<path d="M24 34V23M15 28C-1 27 7 12 13 14 7 0 35-2 34 12c16 8 7 20-10 16Z"/>',
    pine: '<path d="m24 2-9 12h4L9 25h7L6 34h36l-10-9h7L29 14h4L24 2ZM24 34v5"/>',
    city: '<path d="M7 35V13h5v5h5v-5h5v22m4 0V13h5v5h5v-5h5v22M22 24h4M20 35v-7h8v7M7 35h34M22 11V3l13 3-13 5"/>',
    castle:
      '<path d="M7 35V13h5v5h5v-5h5v22m4 0V13h5v5h5v-5h5v22M22 24h4M20 35v-7h8v7M7 35h34"/>',
    house:
      '<path d="m5 20 19-17 19 17M10 18v19h28V18M20 37V25h8v12M13 23h4v5h-4"/>',
    tavern:
      '<path d="m5 20 19-17 19 17M10 18v19h28V18M20 37V25h8v12M34 10h10v13H34M39 13v7"/>',
    temple:
      '<path d="m5 19 19-11 19 11H5ZM10 22v12m9-12v12m10-12v12m9-12v12M5 37h38M24 8V1m-4 3h8"/>',
    dungeon:
      '<path d="M6 36V18L24 4l18 14v18H6Zm8 0V22c0-13 20-13 20 0v14M24 19v17m-9-10h18"/>',
    chest:
      '<path d="M5 17c0-15 38-15 38 0v18H5V17Zm0 0h38M20 13h8v13h-8ZM12 21v14m24-14v14"/>',
    stairs: '<path d="M7 5h34M12 12h29M17 19h24M22 26h19M27 33h14"/>',
    door: '<path d="M12 38V13c0-15 24-15 24 0v25M18 38V14h12v24M26 24h1"/>',
    trap: '<path d="m24 3 21 34H3L24 3Zm0 11v12m0 4v2"/>',
    tower: '<path d="M13 37V6h5v6h5V6h5v6h5V6h5v31H13Zm9 0v-9h7v9M23 18h6"/>',
    well: '<ellipse cx="24" cy="28" rx="15" ry="8"/><path d="M9 28v8c0 9 30 9 30 0v-8M13 24V8h22v16M24 8v19M10 8 24 1l14 7"/>',
  };
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="44" viewBox="0 0 48 44"><g fill="#b8a47d" fill-opacity=".1" stroke="#c6ad79" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round">${bodies[kind] || bodies.house}</g></svg>`)}`;
}
function drawPath(ctx: CanvasRenderingContext2D, p: MapPath, map: MapData) {
  if (p.kind === "corridor") return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (p.kind === "river") smoothPath(ctx, p.points);
  else path(ctx, p.points);
  if (p.kind === "river") {
    ctx.strokeStyle = "#d1dfd5";
    ctx.lineWidth = p.width + 2.5;
    ctx.stroke();
    ctx.strokeStyle = "#789b9a";
    ctx.lineWidth = p.width;
    ctx.stroke();
  } else if (p.kind === "wall") {
    ctx.strokeStyle = "#594f3d";
    ctx.lineWidth = p.width + 2;
    ctx.stroke();
    ctx.strokeStyle = "#b4ac91";
    ctx.lineWidth = p.width;
    ctx.stroke();
    p.points
      .filter((_, n) => n % 2 === 0)
      .forEach((v) => {
        ctx.fillStyle = "#cfc5a7";
        ctx.strokeStyle = "#665c46";
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(v.x, v.y, p.width * 0.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
  } else {
    ctx.strokeStyle =
      p.kind === "border"
        ? "#997b5966"
        : map.kind === "city"
          ? "#dfd1aa"
          : "#837d5d";
    ctx.lineWidth = p.width;
    ctx.setLineDash(
      p.kind === "border" ? [5, 4] : map.kind === "world" ? [3, 5] : [],
    );
    ctx.stroke();
  }
  ctx.restore();
}
function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
  if (!s.points.length) return;
  ctx.save();
  ctx.globalAlpha *= s.opacity;
  ctx.strokeStyle = s.color;
  ctx.fillStyle = s.color;
  ctx.lineWidth = s.size;
  ctx.lineCap = s.tool === "pencil" ? "square" : "round";
  ctx.lineJoin = "round";
  if (s.tool === "eraser") ctx.globalCompositeOperation = "destination-out";
  const a = s.points[0],
    b = s.points[s.points.length - 1];
  if (s.tool === "fill") {
    const img = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const rgb = s.color.match(/[a-f0-9]{2}/gi)!.map((c) => parseInt(c, 16));
    floodFill(img.data, img.width, img.height, a.x, a.y, [
      rgb[0],
      rgb[1],
      rgb[2],
      Math.round(s.opacity * 255),
    ]);
    ctx.putImageData(img, 0, 0);
  } else if (s.tool === "rectangle") {
    ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
  } else if (s.tool === "ellipse") {
    ctx.beginPath();
    ctx.ellipse(
      (a.x + b.x) / 2,
      (a.y + b.y) / 2,
      Math.abs(b.x - a.x) / 2,
      Math.abs(b.y - a.y) / 2,
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  } else {
    if (s.hardness < 0.9 && s.tool === "brush") {
      ctx.shadowColor = s.color;
      ctx.shadowBlur = (1 - s.hardness) * s.size * 0.5;
    }
    path(ctx, s.points);
    if (s.points.length === 1) {
      ctx.beginPath();
      ctx.arc(a.x, a.y, s.size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else ctx.stroke();
  }
  ctx.restore();
}
function drawObject(
  ctx: CanvasRenderingContext2D,
  o: MapObject,
  variant: number,
) {
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.rotate((o.rotation * Math.PI) / 180);
  ctx.scale(o.flipX ? -1 : 1, o.flipY ? -1 : 1);
  if (o.kind === "label") {
    ctx.font = `${o.height}px Georgia, serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = o.color;
    ctx.fillText(o.name, 0, 0, o.width);
  } else if (o.kind === "image" && o.image) {
    const img = imageCache.get(o.image);
    if (img?.complete)
      ctx.drawImage(img, -o.width / 2, -o.height / 2, o.width, o.height);
    else void loadImage(o.image);
  } else drawStamp(ctx, o.kind, o.width, o.height, o.color, variant);
  ctx.restore();
}
export function drawMap(
  ctx: CanvasRenderingContext2D,
  map: MapData,
  options: RenderOptions = {},
) {
  if (map.layers.some((l) => l.mask?.length)) {
    const base = document.createElement("canvas");
    base.width = map.width;
    base.height = map.height;
    const bc = base.getContext("2d")!;
    bc.fillStyle = "#e5dfc5";
    bc.fillRect(0, 0, map.width, map.height);
    for (const layer of map.layers) {
      if (!layer.visible || (options.player && layer.id === "GM-only"))
        continue;
      const part = document.createElement("canvas");
      part.width = map.width;
      part.height = map.height;
      const pc = part.getContext("2d")!;
      const copy = {
        ...map,
        layers: map.layers.map((l) => ({
          ...l,
          mask: undefined,
          opacity: 1,
          blend: "source-over" as GlobalCompositeOperation,
          visible: l.id === layer.id,
        })),
      };
      drawMap(pc, copy, { ...options, transparent: true, ornaments: false });
      if (layer.mask?.length) {
        const mask = document.createElement("canvas");
        mask.width = map.width;
        mask.height = map.height;
        const mc = mask.getContext("2d")!;
        mc.fillStyle = "#ffffff";
        mc.fillRect(0, 0, mask.width, mask.height);
        for (const stroke of layer.mask)
          drawStroke(mc, {
            ...stroke,
            tool: stroke.tool === "eraser" ? "brush" : "eraser",
            color: "#ffffff",
          });
        pc.globalCompositeOperation = "destination-in";
        pc.drawImage(mask, 0, 0);
      }
      bc.save();
      bc.globalAlpha = layer.opacity;
      bc.globalCompositeOperation = layer.blend;
      bc.drawImage(part, 0, 0);
      bc.restore();
    }
    if (options.ornaments !== false) ornaments(bc, map);
    ctx.clearRect(0, 0, map.width, map.height);
    ctx.drawImage(base, 0, 0);
    return;
  }
  ctx.save();
  ctx.clearRect(0, 0, map.width, map.height);
  if (!options.transparent) {
    ctx.fillStyle = "#e5dfc5";
    ctx.fillRect(0, 0, map.width, map.height);
  }
  const layer = (id: string) => map.layers.find((l) => l.id === id);
  const visible = (id: string) =>
    layer(id)?.visible !== false && !(options.player && id === "GM-only");
  if (visible("Terrain")) {
    ctx.save();
    ctx.globalAlpha = layer("Terrain")?.opacity ?? 1;
    ctx.globalCompositeOperation = layer("Terrain")?.blend || "source-over";
    if (map.kind === "dungeon") drawDungeon(ctx, map, options.contours);
    else {
      drawLandscape(ctx, map, options.contours);
      if (map.kind === "world") {
        const r = random(map.settings.seed + "decor");
        for (let n = 0; n < 3000; n++) {
          const x = 30 + r() * 1140,
            y = 30 + r() * 790,
            i =
              Math.floor((y / map.height) * map.rows) * map.cols +
              Math.floor((x / map.width) * map.cols),
            h = map.heights[i],
            b = biomeAt(map, i % map.cols, Math.floor(i / map.cols));
          if (h > 0.71 && n % 3 === 0) {
            ctx.save();
            ctx.translate(x, y);
            drawStamp(ctx, "mountain", 15 + r() * 19, 19 + r() * 23, "#717258");
            ctx.restore();
          } else if ((b === 6 || b === 4 || b === 10) && n % 2 === 0) {
            ctx.save();
            ctx.globalAlpha = 0.7;
            ctx.translate(x, y);
            drawStamp(
              ctx,
              b === 4 ? "pine" : "tree",
              5 + r() * 4,
              7 + r() * 5,
              "#64704f",
            );
            ctx.restore();
          }
        }
      }
    }
    ctx.restore();
  }
  // A separate compositing surface ensures an eraser cannot punch through terrain.
  for (const l of map.layers) {
    if (!visible(l.id) || l.id === "Terrain" || l.id === "Grid") continue;
    ctx.save();
    ctx.globalAlpha = l.opacity;
    ctx.globalCompositeOperation = l.blend;
    map.paths
      .filter((p) => p.layer === l.id)
      .forEach((p) => drawPath(ctx, p, map));
    const strokes = map.strokes.filter((s) => s.layer === l.id);
    if (strokes.length) {
      const paint = document.createElement("canvas");
      paint.width = map.width;
      paint.height = map.height;
      const pc = paint.getContext("2d")!;
      strokes.forEach((s) => drawStroke(pc, s));
      ctx.drawImage(paint, 0, 0);
    }
    map.objects
      .filter((o) => o.layer === l.id)
      .forEach((o, i) => drawObject(ctx, o, i));
    ctx.restore();
  }
  if (map.kind === "world" && visible("Labels")) {
    ctx.save();
    ctx.globalAlpha = layer("Labels")?.opacity ?? 1;
    map.objects
      .filter((o) => ["city", "village", "dungeon"].includes(o.kind))
      .forEach((o) => {
        ctx.font = `${o.kind === "city" ? "bold 12" : "10"}px Georgia`;
        ctx.textAlign = "center";
        ctx.strokeStyle = "#e8e3cb";
        ctx.lineWidth = 3;
        ctx.strokeText(o.name, o.x, o.y + o.height / 2 + 13);
        ctx.fillStyle = "#434837";
        ctx.fillText(o.name, o.x, o.y + o.height / 2 + 13);
      });
    ctx.restore();
  }
  if (map.kind === "dungeon" && visible("Labels")) {
    ctx.save();
    ctx.font = "bold 13px Georgia";
    ctx.textAlign = "center";
    map.rooms.forEach((room) => {
      const x = room.x + room.w / 2,
        y = room.y + room.h / 2;
      ctx.fillStyle = "#eee5cd";
      ctx.strokeStyle = "#86795f";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#4f4738";
      ctx.fillText(String(room.number), x, y + 4);
    });
    ctx.restore();
  }
  if (visible("Grid") && (options.grid || map.settings.grid !== "none"))
    drawGrid(ctx, map, layer("Grid")?.opacity ?? 0.35);
  if (options.ornaments !== false) ornaments(ctx, map);
  ctx.restore();
}
export function drawDungeon(
  ctx: CanvasRenderingContext2D,
  map: MapData,
  contours = false,
) {
  const cell = map.width / map.cols,
    ch = map.height / map.rows;
  const r = random(map.settings.seed + "stone");
  if (map.terrain) drawLandscape(ctx, terrainView(map), contours);
  else {
    ctx.fillStyle = "#807664";
    ctx.fillRect(0, 0, map.width, map.height);
    ctx.strokeStyle = "#5d564b33";
    ctx.lineWidth = 0.6;
    for (let y = 0; y < map.height; y += 12) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(map.width, y);
      ctx.stroke();
      for (let x = ((y / 12) % 2) * 18; x < map.width; x += 36) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 12);
        ctx.stroke();
      }
    }
  }
  for (let y = 0; y < map.rows; y++)
    for (let x = 0; x < map.cols; x++) {
      const i = y * map.cols + x;
      if (!map.heights[i]) continue;
      ctx.fillStyle = r() > 0.5 ? "#e0d6b9" : "#ddd2b3";
      ctx.fillRect(x * cell, y * ch, cell + 0.3, ch + 0.3);
      ctx.strokeStyle = "#eae0c6";
      ctx.lineWidth = 1;
      ctx.strokeRect(x * cell + 3, y * ch + 3, cell - 6, ch - 6);
    }
  ctx.strokeStyle = "#453f33";
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let y = 0; y < map.rows; y++)
    for (let x = 0; x < map.cols; x++) {
      const i = y * map.cols + x;
      if (!map.heights[i]) continue;
      const x0 = x * cell,
        y0 = y * ch;
      if (x === 0 || !map.heights[i - 1]) {
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0, y0 + ch);
      }
      if (x === map.cols - 1 || !map.heights[i + 1]) {
        ctx.moveTo(x0 + cell, y0);
        ctx.lineTo(x0 + cell, y0 + ch);
      }
      if (y === 0 || !map.heights[i - map.cols]) {
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0 + cell, y0);
      }
      if (y === map.rows - 1 || !map.heights[i + map.cols]) {
        ctx.moveTo(x0, y0 + ch);
        ctx.lineTo(x0 + cell, y0 + ch);
      }
    }
  ctx.stroke();
}
function drawGrid(
  ctx: CanvasRenderingContext2D,
  map: MapData,
  opacity: number,
) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = map.kind === "dungeon" ? "#5e5747" : "#536854";
  ctx.lineWidth = 0.6;
  const step = map.kind === "dungeon" ? map.width / map.cols : 50;
  ctx.beginPath();
  if (map.settings.grid === "hex") {
    const h = step * 0.866;
    for (let y = 0; y < map.height / h; y++)
      for (let x = 0; x < map.width / (step * 1.5); x++) {
        const cx = x * step * 1.5,
          cy = y * h * 2 + (x % 2) * h;
        for (let k = 0; k <= 6; k++) {
          const a = (k * Math.PI) / 3,
            px = cx + Math.cos(a) * step,
            py = cy + Math.sin(a) * step;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
      }
  } else {
    for (let x = 0; x < map.width; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, map.height);
    }
    for (
      let y = 0;
      y < map.height;
      y += map.kind === "dungeon" ? map.height / map.rows : step
    ) {
      ctx.moveTo(0, y);
      ctx.lineTo(map.width, y);
    }
  }
  ctx.stroke();
  ctx.restore();
}
function ornaments(ctx: CanvasRenderingContext2D, map: MapData) {
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
