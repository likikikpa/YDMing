import { dungeonName, kingdomCultures, townName } from "./names";
import { realmWord } from "./names-features";
import { featureLabels } from "./region-labels";
import type { Culture } from "./names";
import { siteAt } from "./settlement-site";
import { buildBorders, buildRoutes } from "./regions";
import { buildRiverNetwork } from "./rivers";
import { hash, noise, random } from "./random";
import type { MapData, MapObject } from "./types";
export function worldLakes(map: MapData, seed: string) {
  const r = random(seed + "lakes"),
    sea = map.settings.seaLevel,
    { cols, rows } = map,
    noiseSeed = hash(seed + "lake");
  for (let n = 0; n < map.settings.lakes; n++)
    for (let attempt = 0; attempt < 300; attempt++) {
      const cx = 14 + Math.floor(r() * (cols - 28)),
        cy = 14 + Math.floor(r() * (rows - 28)),
        h = map.heights[cy * cols + cx];
      if (h <= sea + 0.04 || h >= sea + 0.2) continue;
      // Lakes belong inland: refuse spots that touch the sea.
      let coastal = false;
      for (let k = 0; k < 8 && !coastal; k++) {
        const a = (k * Math.PI) / 4,
          px = Math.round(cx + Math.cos(a) * 9),
          py = Math.round(cy + Math.sin(a) * 9);
        coastal = map.heights[py * cols + px] < sea;
      }
      if (coastal) continue;
      const rx = 2.5 + r() * 4,
        ry = 2 + r() * 3,
        tilt = r() * Math.PI;
      for (let dy = -9; dy <= 9; dy++)
        for (let dx = -9; dx <= 9; dx++) {
          const u = (dx * Math.cos(tilt) + dy * Math.sin(tilt)) / rx,
            v = (-dx * Math.sin(tilt) + dy * Math.cos(tilt)) / ry,
            wobble = (noise((cx + dx) / 3, (cy + dy) / 3, noiseSeed) - 0.5) * 0.6,
            d = u * u + v * v;
          if (d < 1 + wobble) {
            const i = (cy + dy) * cols + cx + dx;
            map.heights[i] = Math.min(map.heights[i], sea - 0.02 - (1 - d) * 0.02);
          }
        }
      break;
    }
}
export function worldWater(map: MapData, seed: string) {
  map.paths = map.paths.filter((p) => p.layer !== "Water");
  map.paths.push(
    ...buildRiverNetwork(
      map,
      map.settings.rivers,
      random(seed + "water"),
      `river-${seed}`,
    ),
  );
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
  const total = s.cities + s.towns + s.villages + s.dungeons,
    // Names have their own stream, so they never move a settlement.
    named = random(seed + "names"),
    cultures = kingdomCultures(random(seed + "cultures"), s.kingdoms),
    taken = new Set<string>(),
    seats: { x: number; y: number; culture: Culture }[] = [];
  for (let n = 0; n < total; n++)
    for (let a = 0; a < 1800; a++) {
      const x = 100 + r() * (map.width - 200),
        y = 95 + r() * (map.height - 190),
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
        // A capital speaks its own kingdom's tongue; the rest, the nearest capital's.
        const capital = n < Math.min(s.kingdoms, s.cities);
        let culture: Culture = "human",
          near = Infinity;
        if (capital) culture = cultures[n];
        else
          for (const seat of seats) {
            const d = Math.hypot(seat.x - x, seat.y - y);
            if (d < near) {
              near = d;
              culture = seat.culture;
            }
          }
        if (capital) seats.push({ x, y, culture });
        const size =
            n < s.cities ? "city" : n < s.cities + s.towns ? "town" : "village",
          o: MapObject = {
            id: `settlement-${seed}-${n}`,
            kind,
            x,
            y,
            name:
              kind === "dungeon"
                ? dungeonName(named, culture, taken)
                : townName(named, culture, siteAt(map, x, y, size), taken),
            width: kind === "city" ? 30 : 22,
            height: kind === "city" ? 30 : 22,
            rotation: 0,
            layer: "Objects",
            color: "#473e2b",
          };
        map.objects.push(o);
        break;
      }
    }
  const cities = map.objects.filter((o) => o.kind === "city");
  map.paths.push(
    ...buildRoutes(
      map,
      map.objects.filter((o) => o.id.startsWith("settlement-")),
    ),
  );
  const capitals = cities.slice(0, s.kingdoms);
  if (capitals.length > 1) map.paths.push(...buildBorders(map, capitals, seed));
  capitals.forEach((o, n) =>
    map.objects.push({
      id: `region-${n}`,
      kind: "label",
      x: o.x,
      y: o.y - 45,
      name: `${o.name.toUpperCase()} ${realmWord(seats[n]?.culture ?? "human", n).toUpperCase()}`,
      width: 260,
      height: 13,
      rotation: -6,
      layer: "Labels",
      color: "#606348",
    }),
  );
  // Mountain ranges, forests and seas are named in the tongue of the nearest realm.
  for (const label of featureLabels(map, seats, random(seed + "features"), taken))
    map.objects.push(label);
}
