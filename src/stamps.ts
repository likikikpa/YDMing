import type { StampKind } from "./types";

export function path(
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
