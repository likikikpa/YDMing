import type { MapData } from "./types";

/** How the rivers of a world start and end, for checking the generator against itself. */
export function riverMetrics(map: MapData) {
  const { cols, rows, heights } = map,
    sea = map.settings.seaLevel,
    heightAt = (x: number, y: number) =>
      heights[
        Math.max(0, Math.min(rows - 1, Math.floor((y / map.height) * rows))) *
          cols +
          Math.max(0, Math.min(cols - 1, Math.floor((x / map.width) * cols)))
      ];
  const rivers = map.paths.filter(
    (p) => p.kind === "river" && p.points.length > 1,
  );
  let hill = 0,
    reachWater = 0,
    sourceRise = 0;
  for (const r of rivers) {
    const first = r.points[0],
      last = r.points[r.points.length - 1],
      rise = heightAt(first.x, first.y) - sea;
    sourceRise += rise;
    if (rise > 0.16) hill++;
    // The mouth is in water or within two cells of it.
    let wet = false;
    for (let dy = -2; dy <= 2 && !wet; dy++)
      for (let dx = -2; dx <= 2; dx++)
        if (
          heightAt(
            last.x + (dx * map.width) / cols,
            last.y + (dy * map.height) / rows,
          ) < sea
        ) {
          wet = true;
          break;
        }
    // A tributary ends where it joins another river.
    if (!wet)
      wet = rivers.some(
        (o) =>
          o !== r &&
          o.points.some((q) => Math.hypot(q.x - last.x, q.y - last.y) < 30),
      );
    if (wet) reachWater++;
  }
  const n = rivers.length || 1;
  return {
    rivers: rivers.length,
    fromHills: hill / n,
    reachWater: reachWater / n,
    meanSourceRise: sourceRise / n,
  };
}
