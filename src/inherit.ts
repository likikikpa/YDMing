import { biomeAt, pointSegmentDistance } from "./generator";
import { clamp } from "./random";
import type { MapData, Point } from "./types";
export function inheritCityTerrain(
  world: MapData,
  city: MapData,
  position: Point,
) {
  const radius = 85,
    riverSegments = world.paths
      .filter((p) => p.kind === "river")
      .flatMap((p) =>
        p.points
          .slice(1)
          .map((b, i) => ({
            a: p.points[i],
            b,
            width: p.widths?.[i] ?? p.width,
          })),
      );
  for (let y = 0; y < city.rows; y++)
    for (let x = 0; x < city.cols; x++) {
      const wx = position.x + (x / city.cols - 0.5) * radius,
        wy = position.y + (y / city.rows - 0.5) * radius,
        gx = clamp(
          Math.floor((wx / world.width) * world.cols),
          0,
          world.cols - 1,
        ),
        gy = clamp(
          Math.floor((wy / world.height) * world.rows),
          0,
          world.rows - 1,
        );
      let h = world.heights[gy * world.cols + gx];
      if (
        riverSegments.some(
          (s) =>
            pointSegmentDistance({ x: wx, y: wy }, s.a, s.b) < s.width * 0.9,
        )
      )
        h = world.settings.seaLevel - 0.03;
      city.heights[y * city.cols + x] = h;
      // Resolve the world's climate here, so the city looks like its surroundings.
      const biome = biomeAt(world, gx, gy);
      city.biomes[y * city.cols + x] = biome === 12 ? 0 : biome;
    }
  city.settings.seaLevel = world.settings.seaLevel;
  city.objects = city.objects.filter(
    (o) =>
      o.kind === "label" ||
      city.heights[
        clamp(Math.floor((o.y / city.height) * city.rows), 0, city.rows - 1) *
          city.cols +
          clamp(Math.floor((o.x / city.width) * city.cols), 0, city.cols - 1)
      ] > city.settings.seaLevel,
  );
  return city;
}
