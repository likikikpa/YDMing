import { traceRiver, settlementName } from "./generator";
import { random } from "./random";
import type { MapData, MapObject } from "./types";
export function worldWater(map: MapData, seed: string) {
  const r = random(seed + "water");
  map.paths = map.paths.filter((p) => p.layer !== "Water");
  for (let n = 0; n < map.settings.rivers; n++) {
    let start = -1;
    for (let a = 0; a < 600; a++) {
      const i = Math.floor(r() * map.heights.length);
      if (map.heights[i] > map.settings.seaLevel + 0.12) {
        start = i;
        break;
      }
    }
    if (start < 0) continue;
    const cells = traceRiver(map, start);
    if (cells.length > 4)
      map.paths.push({
        id: `river-${seed}-${n}`,
        points: cells.map((i) => ({
          x: (((i % map.cols) + 0.5) * map.width) / map.cols,
          y: ((Math.floor(i / map.cols) + 0.5) * map.height) / map.rows,
        })),
        kind: "river",
        width: 1.6 + r() * 1.5,
        layer: "Water",
      });
  }
}
export function worldPeople(map: MapData, seed: string) {
  const r = random(seed + "people"),
    s = map.settings;
  map.objects = map.objects.filter(
    (o) => !o.id.startsWith("settlement-") && !o.id.startsWith("region-"),
  );
  map.paths = map.paths.filter(
    (p) => !p.id.startsWith("route-") && !p.id.startsWith("border-"),
  );
  const total = s.cities + s.towns + s.villages + s.dungeons;
  for (let n = 0; n < total; n++)
    for (let a = 0; a < 1800; a++) {
      const x = 100 + r() * 1000,
        y = 95 + r() * 660,
        i =
          Math.floor((y / map.height) * map.rows) * map.cols +
          Math.floor((x / map.width) * map.cols),
        h = map.heights[i];
      if (
        h > s.seaLevel + 0.035 &&
        h < 0.73 &&
        !map.objects.some((o) => Math.hypot(o.x - x, o.y - y) < 60)
      ) {
        const kind =
          n < s.cities
            ? "city"
            : n < total - s.dungeons
              ? "village"
              : "dungeon";
        const o: MapObject = {
          id: `settlement-${seed}-${n}`,
          kind,
          x,
          y,
          name: settlementName(r),
          width: kind === "city" ? 25 : 18,
          height: kind === "city" ? 26 : 18,
          rotation: 0,
          layer: "Objects",
          color: "#473e2b",
        };
        map.objects.push(o);
        break;
      }
    }
  const cities = map.objects.filter((o) => o.kind === "city");
  for (let n = 1; n < cities.length; n++) {
    const a = cities[n - 1],
      b = cities[n];
    map.paths.push({
      id: `route-${n}`,
      kind: "road",
      points: [a, { x: (a.x + b.x) / 2 + 20, y: (a.y + b.y) / 2 - 20 }, b],
      width: 1,
      layer: "Objects",
    });
  }
  const capitals = cities.slice(0, s.kingdoms);
  if (capitals.length > 1) {
    const nearest = (x: number, y: number) => {
      let best = 0,
        distance = Infinity;
      capitals.forEach((o, n) => {
        const d = (o.x - x) ** 2 + (o.y - y) ** 2;
        if (d < distance) {
          best = n;
          distance = d;
        }
      });
      return best;
    };
    for (let y = 2; y < map.rows - 2; y += 2)
      for (let x = 2; x < map.cols - 2; x += 2) {
        if (map.heights[y * map.cols + x] <= s.seaLevel + 0.03) continue;
        const wx = (x * map.width) / map.cols,
          wy = (y * map.height) / map.rows,
          n = nearest(wx, wy);
        if (n !== nearest(wx + 10, wy) || n !== nearest(wx, wy + 10))
          map.paths.push({
            id: `border-${x}-${y}`,
            kind: "border",
            points: [
              { x: wx, y: wy },
              { x: wx + 7, y: wy + 5 },
            ],
            width: 0.7,
            layer: "Objects",
          });
      }
  }
  capitals.forEach((o, n) =>
    map.objects.push({
      id: `region-${n}`,
      kind: "label",
      x: o.x,
      y: o.y - 45,
      name: `${o.name.toUpperCase()} ${["REACH", "MARCHES", "DOMINION", "VALE"][n % 4]}`,
      width: 260,
      height: 13,
      rotation: -6,
      layer: "Labels",
      color: "#606348",
    }),
  );
}
