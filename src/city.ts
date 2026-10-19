import { object, pointSegmentDistance, settlementName } from "./generator";
import { clamp, fbm, hash, noise } from "./random";
import type { MapData, MapObject, MapPath, Point } from "./types";

interface Size {
  count: number;
  radius: number;
}
const SIZES: Record<string, Size> = {
  hamlet: { count: 45, radius: 150 },
  village: { count: 100, radius: 200 },
  town: { count: 240, radius: 270 },
  city: { count: 430, radius: 330 },
  capital: { count: 700, radius: 370 },
};
const TRADES = ["Weaver", "Baker", "Merchant", "Blacksmith", "Cooper", "Tanner"];
const DISTRICTS = [
  "THE OLD QUARTER",
  "MARKET WARD",
  "THE LOWS",
  "TEMPLE DISTRICT",
  "ARTISANS’ ROW",
  "THE HIGH STREET",
  "TANNERS’ END",
];
const GENERATED = /^(building|district|well)-/;

type Road = { points: Point[]; width: number };
const isRoad = (p: MapPath) => p.kind === "road";

function landAt(map: MapData, x: number, y: number) {
  const gx = clamp(Math.floor((x / map.width) * map.cols), 0, map.cols - 1),
    gy = clamp(Math.floor((y / map.height) * map.rows), 0, map.rows - 1);
  return map.heights[gy * map.cols + gx] >= map.settings.seaLevel;
}
/** Splits a polyline wherever it crosses water, so roads and walls never run over lakes. */
function landRuns(map: MapData, points: Point[]) {
  const runs: Point[][] = [];
  let run: Point[] = [];
  for (const p of points) {
    if (landAt(map, p.x, p.y)) run.push(p);
    else {
      if (run.length > 1) runs.push(run);
      run = [];
    }
  }
  if (run.length > 1) runs.push(run);
  return runs;
}
/** A road wanders around a straight line, but meets both ends exactly. */
function wander(
  a: Point,
  b: Point,
  seed: number,
  amount: number,
  steps = 9,
): Point[] {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    length = Math.hypot(dx, dy) || 1,
    nx = -dy / length,
    ny = dx / length;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps,
      offset = (noise(t * 3.2, seed % 97, seed) - 0.5) * amount * Math.sin(Math.PI * t);
    return { x: a.x + dx * t + nx * offset, y: a.y + dy * t + ny * offset };
  });
}

export interface CityPlan {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rot: number;
  gates: Point[];
}

function shapeTerrain(map: MapData, r: () => number, plan: CityPlan) {
  const s = map.settings,
    seed = hash(s.seed),
    ang = r() * Math.PI,
    phase = r() * Math.PI * 2,
    offset = (r() - 0.5) * 150,
    dir = { x: Math.cos(ang), y: Math.sin(ang) },
    shore = Math.max(plan.rx, plan.ry) * 1.08 + r() * 50;
  for (let y = 0; y < map.rows; y++)
    for (let x = 0; x < map.cols; x++) {
      const px = x * 5,
        py = y * 5,
        along = (px - plan.cx) * dir.x + (py - plan.cy) * dir.y,
        across = -(px - plan.cx) * dir.y + (py - plan.cy) * dir.x - offset;
      let h = 0.55 + fbm(x / 50, y / 50, seed) * 0.1;
      if (s.site === "river") {
        const bend = Math.sin(along / 110 + phase) * 40 + (noise(along / 60, 4, seed) - 0.5) * 36,
          half = 16 + Math.sin(along / 190 + phase * 2) * 4 + noise(along / 40, 9, seed) * 6,
          d = Math.abs(across - bend) / half;
        if (d < 1) h = 0.32;
        else if (d < 1.35) h = Math.min(h, 0.46);
      } else if (s.site === "coast") {
        const edge = shore + Math.sin(across / 80 + phase) * 28 + (noise(across / 45, 6, seed) - 0.5) * 34;
        if (along > edge) h = 0.3;
        else if (along > edge - 14) h = Math.min(h, 0.46);
      } else if (s.site === "hill") {
        const d = Math.min(1, Math.hypot((px - plan.cx) / (plan.rx * 1.3), (py - plan.cy) / (plan.ry * 1.3)));
        h += 0.2 * (1 - d) * (1 - d) * (3 - 2 * (1 - d)) * 1.4;
      }
      map.heights[y * map.cols + x] = h;
    }
}

function planRoads(map: MapData, r: () => number, plan: CityPlan) {
  const s = map.settings,
    seed = hash(s.seed),
    scale = (SIZES[s.citySize] ?? SIZES.town).radius / 300,
    roads: Road[] = [],
    inside = (p: Point, k: number) =>
      ((p.x - plan.cx) / (plan.rx * k)) ** 2 + ((p.y - plan.cy) / (plan.ry * k)) ** 2 <= 1,
    at = (angle: number, k: number): Point => ({
      x: plan.cx + Math.cos(angle) * plan.rx * k,
      y: plan.cy + Math.sin(angle) * plan.ry * k,
    });
  if (s.layout === "grid") {
    const tilt = (r() - 0.5) * 0.3,
      cos = Math.cos(tilt),
      sin = Math.sin(tilt),
      spacing = 82 + scale * 22,
      reach = Math.max(plan.rx, plan.ry) * 1.2,
      lines = Math.ceil(reach / spacing);
    for (const vertical of [false, true])
      for (let i = -lines; i <= lines; i++) {
        const main = i === 0,
          points: Point[] = [];
        for (let t = -reach; t <= reach; t += 14) {
          const u = vertical ? i * spacing : t,
            v = vertical ? t : i * spacing,
            p = { x: plan.cx + u * cos - v * sin, y: plan.cy + u * sin + v * cos };
          if (inside(p, 1.12)) points.push(p);
          else if (points.length) break;
        }
        if (points.length > 2)
          roads.push({ points, width: main ? 12 : 7 });
      }
  } else {
    plan.gates.forEach((gate, n) => {
      const outer = {
        x: clamp(plan.cx + (gate.x - plan.cx) * 1.2, 30, 1170),
        y: clamp(plan.cy + (gate.y - plan.cy) * 1.2, 30, 820),
      };
      const inner = wander(gate, { x: plan.cx, y: plan.cy }, seed + n * 31, 70 * scale);
      roads.push({ points: [outer, ...inner], width: 12 });
    });
    const rings = { hamlet: 0, village: 1, town: 1, city: 2, capital: 2 }[
      s.citySize as "town"
    ] ?? 1;
    for (let i = 0; i < rings; i++) {
      const k = rings === 1 ? 0.55 : i ? 0.78 : 0.38,
        points = Array.from({ length: 41 }, (_, n) => {
          const a = (n / 40) * Math.PI * 2,
            wobble = 1 + (noise(Math.cos(a) * 1.4 + i * 5, Math.sin(a) * 1.4, seed) - 0.5) * 0.2;
          return at(a, k * wobble);
        });
      points[40] = points[0];
      roads.push({ points, width: 7 });
    }
    // Lanes branch off the main roads, so the town grows in a natural web.
    const mains = roads.slice(0, plan.gates.length),
      lanes = { hamlet: 3, village: 6, town: 10, city: 16, capital: 22 }[
        s.citySize as "town"
      ] ?? 10;
    for (let i = 0; i < lanes; i++) {
      const road = mains[i % Math.max(1, mains.length)];
      if (!road) break;
      const index = 2 + Math.floor(r() * (road.points.length - 4)),
        a = road.points[index],
        b = road.points[index + 1],
        angle = Math.atan2(b.y - a.y, b.x - a.x) + (i % 2 ? 1 : -1) * (Math.PI / 2 + (r() - 0.5) * 0.6),
        length = (45 + r() * 70) * scale,
        end = { x: a.x + Math.cos(angle) * length, y: a.y + Math.sin(angle) * length };
      if (inside(end, 1.05))
        roads.push({ points: wander(a, end, seed + i * 13, 22, 4), width: 5 });
    }
  }
  return roads;
}

/** Marks every 5 px cell covered by a road, so buildings can avoid them cheaply. */
function roadMask(map: MapData, roads: Road[]) {
  const mask = new Uint8Array(map.cols * map.rows);
  for (const road of roads)
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1],
        b = road.points[i],
        steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2)),
        reach = Math.ceil((road.width / 2 + 1) / 5);
      for (let k = 0; k <= steps; k++) {
        const x = a.x + ((b.x - a.x) * k) / steps,
          y = a.y + ((b.y - a.y) * k) / steps,
          cx = Math.floor(x / 5),
          cy = Math.floor(y / 5);
        for (let dy = -reach; dy <= reach; dy++)
          for (let dx = -reach; dx <= reach; dx++) {
            const gx = cx + dx,
              gy = cy + dy;
            if (gx < 0 || gy < 0 || gx >= map.cols || gy >= map.rows) continue;
            if (Math.hypot(gx * 5 + 2.5 - x, gy * 5 + 2.5 - y) <= road.width / 2 + 1.5)
              mask[gy * map.cols + gx] = 1;
          }
      }
    }
  return mask;
}

/** Builds the street plan: terrain, roads, walls and the keep. */
export function generateCity(map: MapData, r: () => number) {
  const s = map.settings,
    size = SIZES[s.citySize] ?? SIZES.town,
    plan: CityPlan = {
      cx: 600 + (r() - 0.5) * 100,
      cy: 425 + (r() - 0.5) * 70,
      rx: size.radius * (0.92 + r() * 0.16),
      ry: 0,
      rot: r() * Math.PI * 2,
      gates: [],
    };
  plan.ry = plan.rx * (0.78 + r() * 0.12);
  const gateCount = 3 + Math.floor(r() * 3);
  for (let n = 0; n < gateCount; n++) {
    const a = plan.rot + ((n + (r() - 0.5) * 0.5) / gateCount) * Math.PI * 2;
    plan.gates.push({
      x: plan.cx + Math.cos(a) * plan.rx,
      y: plan.cy + Math.sin(a) * plan.ry,
    });
  }
  map.plan = plan;
  shapeTerrain(map, r, plan);
  const roads = planRoads(map, r, plan);
  roads.forEach((road, n) => {
    landRuns(map, road.points).forEach((points, k) =>
      map.paths.push({
        id: `${n < plan.gates.length && s.layout !== "grid" ? "main" : "street"}-road-${n}-${k}`,
        kind: "road",
        points,
        width: road.width,
        layer: "Objects",
      }),
    );
  });
  if (s.defense !== "none") {
    const seed = hash(s.seed + "wall"),
      ring = Array.from({ length: 49 }, (_, n) => {
        const a = (n / 48) * Math.PI * 2,
          wobble = 1 + (noise(Math.cos(a) * 1.6 + 8, Math.sin(a) * 1.6, seed) - 0.5) * 0.1;
        return {
          x: plan.cx + Math.cos(a) * plan.rx * 1.02 * wobble,
          y: plan.cy + Math.sin(a) * plan.ry * 1.02 * wobble,
        };
      });
    ring[48] = ring[0];
    landRuns(map, ring).forEach((points, k) =>
      map.paths.push({
        id: `city-wall-${k}`,
        kind: "wall",
        points,
        width: s.defense === "stone" ? 8 : 4,
        layer: "Objects",
      }),
    );
    if (s.layout !== "grid")
      plan.gates.forEach((gate, n) => {
        const a = Math.atan2(gate.y - plan.cy, gate.x - plan.cx) + Math.PI / 2;
        for (const side of [-1, 1])
          if (landAt(map, gate.x + Math.cos(a) * 15 * side, gate.y + Math.sin(a) * 15 * side))
            map.objects.push(
              object(
                `gate-tower-${n}-${side}`,
                "tower",
                gate.x + Math.cos(a) * 15 * side,
                gate.y + Math.sin(a) * 15 * side,
                "Gate tower",
                16,
                20,
              ),
            );
      });
  }
  if (s.citySize !== "hamlet" && s.citySize !== "village") {
    const a = plan.rot + Math.PI / gateCount + r() * 0.8,
      keep = {
        x: plan.cx + Math.cos(a) * plan.rx * 0.5,
        y: plan.cy + Math.sin(a) * plan.ry * 0.5,
      };
    // The keep is large, so all of its footprint must be dry.
    const dry = [[0, 0], [28, 0], [-28, 0], [0, 28], [0, -28]].every(([dx, dy]) =>
      landAt(map, keep.x + dx, keep.y + dy),
    );
    if (dry)
      map.objects.push(
        object("citadel", "castle", keep.x, keep.y, "The High Keep", s.citySize === "town" ? 50 : 65, s.citySize === "town" ? 50 : 65),
      );
  }
  map.objects.push(
    object("plaza", "well", plan.cx, plan.cy, "Market Square", 24, 24),
  );
  cityBuildings(map, r);
}

/** Fills the streets with houses, taverns, a temple and district names. */
export function cityBuildings(map: MapData, r: () => number) {
  const s = map.settings,
    plan = map.plan,
    size = SIZES[s.citySize] ?? SIZES.town;
  if (!plan) return;
  map.objects = map.objects.filter((o) => !GENERATED.test(o.id));
  const roads: Road[] = map.paths.filter(isRoad).map((p) => ({ points: p.points, width: p.width })),
    mask = roadMask(map, roads),
    limit = s.defense === "none" ? 1.12 : 0.97,
    placed: { x: number; y: number; r: number }[] = [],
    buckets = new Map<string, number[]>(),
    key = (x: number, y: number) => `${Math.floor(x / 30)},${Math.floor(y / 30)}`;
  const remember = (x: number, y: number, radius: number) => {
    const k = key(x, y);
    (buckets.get(k) ?? buckets.set(k, []).get(k)!).push(placed.push({ x, y, r: radius }) - 1);
  };
  for (const o of map.objects.filter((o) => o.kind !== "label"))
    remember(o.x, o.y, Math.max(o.width, o.height) * 0.6);
  const free = (x: number, y: number, radius: number) => {
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++)
        for (const i of buckets.get(key(x + dx * 30, y + dy * 30)) ?? [])
          if (Math.hypot(placed[i].x - x, placed[i].y - y) < placed[i].r + radius) return false;
    return true;
  };
  const blocked = (x: number, y: number) => {
    const gx = Math.floor(x / 5),
      gy = Math.floor(y / 5);
    return gx < 0 || gy < 0 || gx >= map.cols || gy >= map.rows || mask[gy * map.cols + gx] === 1;
  };
  const ellipse = (x: number, y: number) =>
    Math.hypot((x - plan.cx) / plan.rx, (y - plan.cy) / plan.ry);
  const nearestAngle = (x: number, y: number) => {
    let best = Infinity,
      angle = 0;
    for (const road of roads)
      for (let i = 1; i < road.points.length; i++) {
        const d = pointSegmentDistance({ x, y }, road.points[i - 1], road.points[i]);
        if (d < best) {
          best = d;
          angle = Math.atan2(
            road.points[i].y - road.points[i - 1].y,
            road.points[i].x - road.points[i - 1].x,
          );
        }
      }
    return angle;
  };
  let serial = 0;
  const kindFor = (x: number, y: number) => {
    const d = ellipse(x, y);
    if (serial === 3) return "temple";
    if (r() < 0.025 + (d < 0.5 ? 0.02 : 0)) return "tavern";
    if (d > 0.85 && r() < 0.03) return "tower";
    return "house";
  };
  const place = (x: number, y: number, rotation: number, w: number, h: number) => {
    const corners = [
      [0, 0],
      [w / 2, h / 2],
      [-w / 2, h / 2],
      [w / 2, -h / 2],
      [-w / 2, -h / 2],
      [w / 2, 0],
      [-w / 2, 0],
      [0, h / 2],
      [0, -h / 2],
    ];
    const cos = Math.cos(rotation),
      sin = Math.sin(rotation);
    for (const [cx, cy] of corners) {
      const px = x + cx * cos - cy * sin,
        py = y + cx * sin + cy * cos;
      if (blocked(px, py) || !landAt(map, px, py)) return false;
    }
    if (!free(x, y, Math.hypot(w, h) * 0.42)) return false;
    const kind = kindFor(x, y),
      n = serial++,
      o: MapObject = object(
        `building-${n}`,
        kind,
        x,
        y,
        kind === "tavern"
          ? `The ${["Copper", "Wandering", "Silver", "Drunken"][n % 4]} ${["Stag", "Griffin", "Dragon", "Fox"][(n >> 2) % 4]}`
          : kind === "house"
            ? `${TRADES[n % TRADES.length]}’s house`
            : kind === "temple"
              ? "Temple"
              : "Watchtower",
        kind === "temple" ? 26 : w,
        kind === "temple" ? 28 : h,
      );
    // Line-art roofs stay upright; the street angle only shaped the footprint.
    o.rotation = 0;
    o.owner = settlementName(r);
    map.objects.push(o);
    remember(x, y, Math.hypot(w, h) * 0.42);
    return true;
  };
  const target = size.count,
    alongTarget = Math.floor(target * 0.7);
  // First, frontages: houses line both sides of every street.
  const order = roads.map((_, i) => i).sort(() => r() - 0.5);
  for (const index of order) {
    const road = roads[index];
    for (let i = 1; i < road.points.length && serial < alongTarget; i++) {
      const a = road.points[i - 1],
        b = road.points[i],
        length = Math.hypot(b.x - a.x, b.y - a.y);
      if (length < 1) continue;
      const tangent = Math.atan2(b.y - a.y, b.x - a.x),
        nx = -(b.y - a.y) / length,
        ny = (b.x - a.x) / length;
      for (let at = 6 + r() * 6; at < length; at += 13 + r() * 9)
        for (const side of [-1, 1]) {
          const w = 10 + r() * 8,
            h = 12 + r() * 8,
            off = road.width / 2 + h / 2 + 3 + r() * 4,
            x = a.x + ((b.x - a.x) * at) / length + nx * off * side,
            y = a.y + ((b.y - a.y) * at) / length + ny * off * side,
            d = ellipse(x, y);
          if (d > limit || Math.hypot(x - plan.cx, y - plan.cy) < 42) continue;
          if (r() > clamp(1.05 - d * 0.55)) continue;
          place(x, y, tangent, w, h);
        }
    }
  }
  // Then infill: back lots between the streets, oriented like the nearest street.
  for (let attempt = 0; attempt < target * 30 && serial < target; attempt++) {
    const a = r() * Math.PI * 2,
      d = Math.sqrt(r()) * limit,
      x = plan.cx + Math.cos(a) * plan.rx * d,
      y = plan.cy + Math.sin(a) * plan.ry * d;
    if (Math.hypot(x - plan.cx, y - plan.cy) < 42 || r() > clamp(1.05 - d * 0.55)) continue;
    place(x, y, nearestAngle(x, y) + (r() - 0.5) * 0.2, 10 + r() * 9, 12 + r() * 9);
  }
  const names = [...DISTRICTS].sort(() => r() - 0.5);
  for (let i = 0; i < 4; i++) {
    const a = plan.rot + Math.PI / 4 + (i * Math.PI) / 2,
      x = plan.cx + Math.cos(a) * plan.rx * 0.58,
      y = plan.cy + Math.sin(a) * plan.ry * 0.58;
    if (landAt(map, x, y))
      map.objects.push(object(`district-${i}`, "label", x, y + 4, names[i], 185, 15));
  }
}
