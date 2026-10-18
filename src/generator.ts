import { drainage } from "./drainage";
import { worldPeople, worldWater } from "./generation-parts";
import { clamp, fbm, hash, random } from "./random";
import { defaultSettings, makeLayers } from "./types";
import type {
  GeneratorSettings,
  MapData,
  MapKind,
  MapObject,
  Point,
  Room,
  SrdEntry,
} from "./types";
import srdData from "./data/srd.json";
export const SRD = srdData as SrdEntry[];
export const BIOMES = [
  "Auto",
  "Snow",
  "Rock",
  "Tundra",
  "Taiga",
  "Grassland",
  "Forest",
  "Swamp",
  "Desert",
  "Savanna",
  "Jungle",
  "Beach",
  "Sea",
];
const syllables = [
  "Ash",
  "Elder",
  "Raven",
  "Thorn",
  "Briar",
  "Mist",
  "Silver",
  "Oak",
  "Hollow",
  "Ember",
  "Wind",
  "Stone",
  "Gold",
  "Frost",
  "Green",
];
const suffixes = [
  "mere",
  "fall",
  "haven",
  "hold",
  "watch",
  "wick",
  "brook",
  "reach",
  "ford",
  "hollow",
  "crest",
  "gate",
];
export function settlementName(r: () => number) {
  return (
    syllables[Math.floor(r() * syllables.length)] +
    suffixes[Math.floor(r() * suffixes.length)]
  );
}
export function biomeAt(map: MapData, x: number, y: number) {
  const i = Math.max(0, Math.min(map.heights.length - 1, y * map.cols + x)),
    h = map.heights[i],
    s = map.settings;
  if (map.biomes[i] > 0) return map.biomes[i];
  if (h < s.seaLevel) return 12;
  if (h < s.seaLevel + 0.025) return 11;
  const latitude = (Math.abs(y / map.rows - 0.5) * s.latitude) / 65;
  const temp =
    0.9 - latitude * 0.8 - (h - s.seaLevel) * 0.9 + s.temperature / 100;
  const upwind =
    map.heights[
      y * map.cols +
        Math.max(0, Math.min(map.cols - 1, x + (s.wind === "east" ? 8 : -8)))
    ] || h;
  const moisture =
    s.rainfall / 100 +
    fbm(x / 30, y / 30, hash(s.seed) + 9) * 0.25 -
    Math.max(0, upwind - h) * 1.8;
  if (temp < 0.12 || h > 0.87) return 1;
  if (h > 0.74) return 2;
  if (temp < 0.3) return moisture > 0.55 ? 4 : 3;
  if (temp > 0.65) return moisture < 0.4 ? 8 : moisture > 0.8 ? 10 : 9;
  if (h < s.seaLevel + 0.06 && moisture > 0.8) return 7;
  return moisture > 0.61 ? 6 : 5;
}
export function createEmptyMap(
  kind: MapKind,
  settings: GeneratorSettings = defaultSettings,
  name?: string,
  id?: string,
): MapData {
  const s = { ...settings },
    r = random(s.seed),
    cols = kind === "dungeon" ? s.dungeonSize : 240,
    rows = kind === "dungeon" ? Math.round(cols * 0.7) : 170;
  const map: MapData = {
    id: id || `map-${hash(s.seed + kind)}`,
    name:
      name ||
      (kind === "world"
        ? "The Eldermere Reach"
        : kind === "city"
          ? settlementName(r)
          : "The Hollow Sanctum"),
    kind,
    width: 1200,
    height: 850,
    cols,
    rows,
    heights: new Array(cols * rows).fill(0),
    biomes: new Array(cols * rows).fill(0),
    objects: [],
    paths: [],
    strokes: [],
    rooms: [],
    layers: makeLayers(),
    settings: s,
  };
  return map;
}
export function generateMap(
  kind: MapKind,
  settings: GeneratorSettings = defaultSettings,
  name?: string,
  id?: string,
): MapData {
  const r = random(settings.seed);
  const resolvedName = name || (kind === "city" ? settlementName(r) : undefined);
  const map = createEmptyMap(kind, settings, resolvedName, id);
  if (kind === "world") generateWorld(map, r);
  else if (kind === "city") generateCity(map, r);
  else generateDungeon(map, r);
  return map;
}
function object(
  id: string,
  kind: MapObject["kind"],
  x: number,
  y: number,
  name: string,
  width = 25,
  height = 25,
): MapObject {
  return {
    id,
    kind,
    x,
    y,
    name,
    width,
    height,
    rotation: 0,
    layer: kind === "label" ? "Labels" : "Objects",
    color: "#473e2b",
  };
}
function generateWorld(map: MapData, r: () => number) {
  const s = map.settings,
    seed = hash(s.seed),
    { cols, rows } = map;
  const blobs = Array.from(
    {
      length:
        s.template === "archipelago"
          ? 14
          : s.template === "pangaea" || s.template === "island"
            ? 1
            : 5,
    },
    (_, i) => ({
      x: i === 0 ? 0.48 : 0.16 + r() * 0.68,
      y: i === 0 ? 0.5 : 0.17 + r() * 0.66,
      rx:
        s.template === "archipelago"
          ? 0.1 + r() * 0.11
          : s.template === "island"
            ? 0.32
            : 0.25 + r() * 0.17,
      ry: s.template === "archipelago" ? 0.1 + r() * 0.14 : 0.32 + r() * 0.15,
    }),
  );
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const nx = x / cols,
        ny = y / rows,
        warp = fbm(nx * 4, ny * 4, seed, 4) - 0.5;
      let shape = Math.max(
        ...blobs.map(
          (b) =>
            1 -
            Math.sqrt(
              ((nx - b.x + warp * 0.16) / b.rx) ** 2 +
                ((ny - b.y + warp * 0.12) / b.ry) ** 2,
            ),
        ),
      );
      if (s.template === "peninsula")
        shape = Math.max(shape, 0.55 - nx * 1.4 - Math.abs(ny - 0.5));
      const broad = fbm(nx * 5.2, ny * 5.2, seed + 87),
        detail = fbm(nx * 25, ny * 25, seed + 150, 3),
        ridge = 1 - Math.abs(fbm(nx * 8, ny * 8, seed + 250) * 2 - 1);
      const base =
        0.25 +
        shape * 0.43 +
        (broad - 0.5) * (0.28 + s.roughness / 300) +
        (detail - 0.5) * 0.065 +
        (s.land - 54) / 160;
      const mountains =
        Math.max(0, ridge - 0.62) *
        (s.mountains / 100) *
        1.5 *
        Math.max(0, shape);
      const edge = Math.min(nx, ny, 1 - nx, 1 - ny);
      map.heights[y * cols + x] = clamp(
        base + mountains - Math.max(0, 0.065 - edge) * 7,
      );
    }
  // Repeated lowest-neighbour descent creates continuous watercourses.
  for (let n = 0; n < s.rivers; n++) {
    let start = -1;
    for (let a = 0; a < 500; a++) {
      const i = Math.floor(r() * map.heights.length);
      if (map.heights[i] > s.seaLevel + 0.15 && map.heights[i] < 0.85) {
        start = i;
        break;
      }
    }
    if (start < 0) continue;
    const cells = traceRiver(map, start);
    if (cells.length > 5)
      map.paths.push({
        id: `river-${n}`,
        points: cells.map((i) => ({
          x: ((i % cols) + 0.5) * 5,
          y: (Math.floor(i / cols) + 0.5) * 5,
        })),
        kind: "river",
        width: 1.6 + r() * 1.7,
        layer: "Water",
      });
  }
  for (let n = 0; n < s.lakes; n++) {
    for (let a = 0; a < 200; a++) {
      const x = 20 + Math.floor(r() * (cols - 40)),
        y = 20 + Math.floor(r() * (rows - 40)),
        i = y * cols + x;
      if (
        map.heights[i] > s.seaLevel + 0.03 &&
        map.heights[i] < s.seaLevel + 0.12
      ) {
        for (let dy = -2; dy <= 2; dy++)
          for (let dx = -3; dx <= 3; dx++)
            if ((dx * dx) / 9 + (dy * dy) / 4 < 1)
              map.heights[(y + dy) * cols + x + dx] = s.seaLevel - 0.015;
        break;
      }
    }
  }
  worldPeople(map, s.seed);
}
export function traceRiver(map: MapData, start: number): number[] {
  const downstream = drainage(map),
    path: number[] = [],
    seen = new Set<number>();
  let current = start;
  for (let steps = 0; steps < map.heights.length; steps++) {
    if (seen.has(current) || current < 0) break;
    seen.add(current);
    path.push(current);
    if (map.heights[current] < map.settings.seaLevel) break;
    const next = downstream[current];
    if (next < 0) break;
    if (map.heights[next] >= map.heights[current])
      map.heights[next] = Math.max(0, map.heights[current] - 0.00001);
    current = next;
  }
  return path;
}

function generateCity(map: MapData, r: () => number) {
  const s = map.settings,
    seed = hash(s.seed),
    sizes: Record<string, number> = {
      hamlet: 45,
      village: 100,
      town: 240,
      city: 430,
      capital: 700,
    },
    count = sizes[s.citySize] || 240;
  for (let y = 0; y < map.rows; y++)
    for (let x = 0; x < map.cols; x++) {
      const riverX = 130 + Math.sin(y / 28) * 12;
      map.heights[y * map.cols + x] =
        s.site === "river" && Math.abs(x - riverX) < 7
          ? 0.32
          : s.site === "coast" && x > 185 + Math.sin(y / 15) * 8
            ? 0.3
            : 0.55 + fbm(x / 50, y / 50, seed) * 0.1;
    }
  const center = { x: 560, y: 430 };
  const gates = [
    { x: 240, y: 220 },
    { x: 900, y: 270 },
    { x: 870, y: 650 },
    { x: 270, y: 670 },
  ];
  gates.forEach((p, n) =>
    map.paths.push({
      id: `main-road-${n}`,
      kind: "road",
      points: [
        p,
        {
          x: (p.x + center.x) / 2,
          y:
            (p.y + center.y) / 2 +
            (s.layout === "organic" ? (r() - 0.5) * 70 : 0),
        },
        center,
      ],
      width: 12,
      layer: "Objects",
    }),
  );
  for (let n = 0; n < 8; n++) {
    const a = (n / 8) * Math.PI * 2,
      b = ((n + 1) / 8) * Math.PI * 2;
    map.paths.push({
      id: `ring-road-${n}`,
      kind: "road",
      points: [
        { x: center.x + Math.cos(a) * 230, y: center.y + Math.sin(a) * 210 },
        { x: center.x + Math.cos(b) * 230, y: center.y + Math.sin(b) * 210 },
      ],
      width: 7,
      layer: "Objects",
    });
  }
  for (let n = 0; n < count; n++) {
    let x = 230 + r() * 660,
      y = 170 + r() * 520;
    if (s.layout === "grid") {
      x = Math.round(x / 28) * 28;
      y = Math.round(y / 28) * 28;
    }
    const dx = (x - center.x) / 340,
      dy = (y - center.y) / 270;
    if (dx * dx + dy * dy > 1 || Math.hypot(x - center.x, y - center.y) < 45)
      continue;
    const gx = Math.floor(x / 5),
      gy = Math.floor(y / 5);
    if (map.heights[gy * map.cols + gx] < s.seaLevel) continue;
    if (
      map.paths.some((p) =>
        p.points
          .slice(1)
          .some(
            (b, i) =>
              pointSegmentDistance({ x, y }, p.points[i], b) < p.width + 9,
          ),
      )
    )
      continue;
    const kind =
        n % 41 === 0
          ? "temple"
          : n % 29 === 0
            ? "tavern"
            : n % 61 === 0
              ? "tower"
              : "house",
      o = object(
        `building-${n}`,
        kind,
        x,
        y,
        kind === "tavern"
          ? `The ${["Copper", "Wandering", "Silver", "Drunken"][n % 4]} ${["Stag", "Griffin", "Dragon", "Fox"][n % 4]}`
          : kind === "house"
            ? `${["Weaver", "Baker", "Merchant", "Blacksmith"][n % 4]}'s house`
            : kind,
        10 + r() * 11,
        14 + r() * 12,
      );
    o.rotation = s.layout === "grid" ? 0 : r() * 360;
    o.owner = settlementName(r);
    map.objects.push(o);
  }
  if (s.defense !== "none") {
    const pts = Array.from({ length: 25 }, (_, n) => {
      const a = (n / 24) * Math.PI * 2;
      return {
        x: center.x + Math.cos(a) * 360,
        y: center.y + Math.sin(a) * 290,
      };
    });
    map.paths.push({
      id: "city-wall",
      kind: "wall",
      points: pts,
      width: s.defense === "stone" ? 8 : 4,
      layer: "Objects",
    });
  }
  map.objects.push(
    object("citadel", "castle", 470, 230, "The High Keep", 65, 65),
    object("plaza", "well", 560, 430, "Market Square", 24, 24),
  );
  ["THE OLD QUARTER", "MARKET WARD", "THE LOWS", "TEMPLE DISTRICT"].forEach(
    (label, i) =>
      map.objects.push(
        object(
          `district-${i}`,
          "label",
          410 + (i % 2) * 270,
          350 + Math.floor(i / 2) * 210,
          label,
          185,
          15,
        ),
      ),
  );
}
export function pointSegmentDistance(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1));
  return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t);
}
export const encounterBudget = (level: number, party: number) =>
  [
    0, 50, 100, 150, 250, 500, 600, 750, 1000, 1300, 1600, 1900, 2200, 2600,
    2900, 3300, 3800, 4500, 5000, 6000, 7000,
  ][clamp(level, 1, 20)] * party;
export function keyRoom(room: Room, s: GeneratorSettings, r: () => number) {
  const budget = encounterBudget(s.level, s.party);
  const themes: Record<string, string[]> = {
    undead: ["undead"],
    monstrous: ["monstrosity"],
    vermin: ["beast"],
    aberrant: ["aberration"],
    giant: ["giant"],
    aquatic: ["beast", "elemental"],
    underdark: ["aberration", "monstrosity"],
    arcane: ["construct", "elemental"],
    fire: ["elemental", "fiend"],
    cold: ["elemental", "giant"],
    infernal: ["fiend"],
  };
  const types = themes[s.theme];
  let monsters = SRD.filter(
    (e) =>
      e.kind === "monster" &&
      (e.xp || 0) > 0 &&
      (e.xp || 0) <= budget &&
      (!types || types.includes(e.type || "")),
  );
  if (!monsters.length)
    monsters = SRD.filter(
      (e) => e.kind === "monster" && (e.xp || 0) > 0 && (e.xp || 0) <= budget,
    );
  const maxTier = s.level < 5 ? 1 : s.level < 11 ? 2 : s.level < 17 ? 3 : 4;
  const rarities = ["common", "uncommon", "rare", "very-rare", "legendary"];
  const items = SRD.filter(
    (e) =>
      e.kind === "item" &&
      rarities.indexOf(e.rarity || "") >= 0 &&
      rarities.indexOf(e.rarity || "") <= maxTier,
  );
  const roll = r();
  room.type =
    roll < 0.24
      ? "empty"
      : roll < 0.55
        ? "monster"
        : roll < 0.7
          ? "trap"
          : roll < 0.87
            ? "treasure"
            : "feature";
  room.description =
    room.type === "empty"
      ? [
          "Dust and broken pottery cover the floor.",
          "A quiet chamber with soot-stained walls.",
          "Water drips from a cracked ceiling.",
        ][Math.floor(r() * 3)]
      : room.type === "monster"
        ? "An occupied lair. The inhabitants watch the entrance."
        : room.type === "trap"
          ? `A concealed pressure plate triggers falling stones. DC ${10 + Math.floor(s.level / 2)} Perception to notice; DC ${10 + Math.floor(s.level / 2)} Dexterity save; ${Math.max(1, Math.ceil(s.level / 4))}d6 bludgeoning damage. (Original trap)`
          : room.type === "treasure"
            ? "An iron-bound chest sits beneath a faded tapestry."
            : [
                "A moonlit altar, carved with a forgotten name.",
                "A still pool reflects unfamiliar stars.",
                "A crumbling statue guards a sealed alcove.",
              ][Math.floor(r() * 3)];
  if (room.type === "monster" && monsters.length)
    room.monster = monsters[Math.floor(r() * monsters.length)].key;
  if (room.type === "treasure" && items.length)
    room.item = items[Math.floor(r() * items.length)].key;
}
function generateDungeon(map: MapData, r: () => number) {
  const s = map.settings,
    cell = map.width / map.cols;
  const carve = (x: number, y: number, w: number, h: number) => {
    for (let yy = Math.max(0, y); yy < Math.min(map.rows, y + h); yy++)
      for (let xx = Math.max(0, x); xx < Math.min(map.cols, x + w); xx++)
        map.heights[yy * map.cols + xx] = 1;
  };
  const leaves: { x: number; y: number; w: number; h: number }[] = [];
  function split(x: number, y: number, w: number, h: number, depth: number) {
    const minimum = Math.max(7, s.roomSize + 3);
    if (
      depth > 4 ||
      (w < minimum * 2 && h < minimum * 2) ||
      (depth > 1 && r() > 0.4 + s.density / 160)
    ) {
      leaves.push({ x, y, w, h });
      return;
    }
    const vertical = w / h > 1.25 || (w / h > 0.8 && r() > 0.5);
    if (vertical && w >= minimum * 2) {
      const at = Math.floor(w * (0.4 + r() * 0.2));
      split(x, y, at, h, depth + 1);
      split(x + at, y, w - at, h, depth + 1);
    } else if (h >= minimum * 2) {
      const at = Math.floor(h * (0.4 + r() * 0.2));
      split(x, y, w, at, depth + 1);
      split(x, y + at, w, h - at, depth + 1);
    } else leaves.push({ x, y, w, h });
  }
  split(2, 2, map.cols - 4, map.rows - 4, 0);
  leaves.forEach((leaf, n) => {
    const w = Math.max(
        3,
        Math.min(leaf.w - 2, 3 + Math.floor(r() * s.roomSize)),
      ),
      h = Math.max(3, Math.min(leaf.h - 2, 3 + Math.floor(r() * s.roomSize))),
      x = leaf.x + 1 + Math.floor(r() * Math.max(1, leaf.w - w - 2)),
      y = leaf.y + 1 + Math.floor(r() * Math.max(1, leaf.h - h - 2));
    carve(x, y, w, h);
    if (s.irregular && w > 4 && h > 4) carve(x - 1, y + 1, 2, h - 2);
    const room: Room = {
      id: `room-${n}`,
      x: x * cell,
      y: y * cell,
      w: w * cell,
      h: h * cell,
      number: n + 1,
      type: "empty",
      description: "",
    };
    keyRoom(room, s, r);
    map.rooms.push(room);
  });
  const connected = new Set([0]);
  while (connected.size < map.rooms.length) {
    let best: [number, number] = [0, 0],
      dist = Infinity;
    for (const a of connected)
      for (let b = 0; b < map.rooms.length; b++) {
        if (connected.has(b)) continue;
        const ra = map.rooms[a],
          rb = map.rooms[b],
          d = Math.hypot(ra.x - rb.x, ra.y - rb.y);
        if (d < dist) {
          dist = d;
          best = [a, b];
        }
      }
    const [a, b] = best,
      ra = map.rooms[a],
      rb = map.rooms[b],
      ax = Math.floor((ra.x + ra.w / 2) / cell),
      ay = Math.floor((ra.y + ra.h / 2) / cell),
      bx = Math.floor((rb.x + rb.w / 2) / cell),
      by = Math.floor((rb.y + rb.h / 2) / cell);
    if (s.corridors === "straight") {
      let x = ax,
        y = ay;
      while (x !== bx || y !== by) {
        carve(x, y, 1, 1);
        if (x !== bx) {
          x += Math.sign(bx - x);
          carve(x, y, 1, 1);
        }
        if (y !== by) y += Math.sign(by - y);
      }
      carve(bx, by, 1, 1);
    } else if (s.corridors === "labyrinth") {
      const mid = Math.max(
        2,
        Math.min(map.rows - 3, Math.round((ay + by) / 2 + (r() - 0.5) * 10)),
      );
      carve(ax, Math.min(ay, mid), 1, Math.abs(ay - mid) + 1);
      carve(Math.min(ax, bx), mid, Math.abs(bx - ax) + 1, 1);
      carve(bx, Math.min(mid, by), 1, Math.abs(by - mid) + 1);
    } else {
      carve(Math.min(ax, bx), ay, Math.abs(bx - ax) + 1, 1);
      carve(bx, Math.min(ay, by), 1, Math.abs(by - ay) + 1);
    }
    map.paths.push({
      id: `corridor-${b}`,
      kind: "corridor",
      points: [
        { x: (ax + 0.5) * cell, y: (ay + 0.5) * cell },
        { x: (bx + 0.5) * cell, y: (ay + 0.5) * cell },
        { x: (bx + 0.5) * cell, y: (by + 0.5) * cell },
      ],
      width: cell,
      layer: "Terrain",
    });
    connected.add(b);
    if (s.doors !== "none")
      map.objects.push({
        ...object(
          `door-${b}`,
          s.doors === "secret" ? "secret" : "door",
          ay !== by ? (bx + 0.5) * cell : ax < bx ? rb.x : rb.x + rb.w,
          ay !== by ? (ay < by ? rb.y : rb.y + rb.h) : (by + 0.5) * cell,
          `${s.doors.charAt(0).toUpperCase() + s.doors.slice(1)} door`,
          cell * 0.8,
          cell * 0.35,
        ),
        layer: s.doors === "secret" ? "GM-only" : "Objects",
      });
  }
  if (s.stairs && map.rooms.length) {
    [map.rooms[0], map.rooms[map.rooms.length - 1]].forEach((room, n) =>
      map.objects.push(
        object(
          `stairs-${n}`,
          "stairs",
          room.x + cell,
          room.y + cell,
          n ? "Stairs down" : "Stairs up",
          cell,
          cell,
        ),
      ),
    );
  }
  map.rooms.forEach((room) => {
    if (room.type === "trap")
      map.objects.push({
        ...object(
          `trap-${room.number}`,
          "trap",
          room.x + cell,
          room.y + cell,
          "Pressure plate",
          cell * 0.6,
          cell * 0.6,
        ),
        layer: "GM-only",
      });
    if (room.type === "treasure")
      map.objects.push(
        object(
          `chest-${room.number}`,
          "chest",
          room.x + cell,
          room.y + cell,
          "Treasure",
          cell * 0.7,
          cell * 0.5,
        ),
      );
  });
  map.settings.grid = s.grid === "none" ? "square" : s.grid;
}
export function rerollGroup(
  map: MapData,
  group: string,
  settings: GeneratorSettings,
): MapData {
  if (group === "all") {
    const next = generateMap(map.kind, settings, map.name, map.id);
    next.parentId = map.parentId;
    next.parentPosition = map.parentPosition;
    return next;
  }
  const out = structuredClone(map),
    seed = settings.seed;
  out.settings = { ...settings, seed: map.settings.seed };
  if (group === "water") {
    worldWater(out, seed);
  } else if (group === "people") {
    worldPeople(out, seed);
  } else if (group === "contents") {
    out.rooms.forEach((room) => {
      delete room.monster;
      delete room.item;
      keyRoom(room, settings, random(seed + room.id));
    });
    out.objects = out.objects.filter(
      (o) => !o.id.startsWith("trap-") && !o.id.startsWith("chest-"),
    );
    const cell = out.width / out.cols;
    for (const room of out.rooms)
      if (room.type === "trap" || room.type === "treasure")
        out.objects.push({
          ...object(
            `${room.type === "trap" ? "trap" : "chest"}-${room.number}`,
            room.type === "trap" ? "trap" : "chest",
            room.x + cell,
            room.y + cell,
            room.type,
            cell * 0.6,
            cell * 0.6,
          ),
          layer: room.type === "trap" ? "GM-only" : "Objects",
        });
  } else {
    const next = generateMap(map.kind, settings, map.name, map.id);
    if (group === "buildings") out.objects = next.objects;
    else {
      out.heights = next.heights;
      out.biomes = next.biomes;
      out.paths = next.paths;
    }
  }
  return out;
}
