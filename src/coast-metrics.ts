import { Biome } from "./biomes";
import { biomeAt } from "./generator";
import type { MapData } from "./types";

/** Measures of a world's coast, for checking the generator against itself. */
export function coastMetrics(map: MapData) {
  const { cols, rows, heights } = map,
    sea = map.settings.seaLevel,
    land = (i: number) => heights[i] >= sea;
  let landCells = 0,
    coast = 0;
  const comp = new Int32Array(cols * rows).fill(-1),
    sizes: number[] = [];
  for (let i = 0; i < cols * rows; i++) {
    if (!land(i)) continue;
    landCells++;
    const x = i % cols,
      y = Math.floor(i / cols);
    const wet = [
      x > 0 && !land(i - 1),
      x < cols - 1 && !land(i + 1),
      y > 0 && !land(i - cols),
      y < rows - 1 && !land(i + cols),
    ];
    if (wet.some(Boolean)) coast++;
    if (comp[i] < 0) {
      let size = 0;
      const stack = [i];
      comp[i] = sizes.length;
      while (stack.length) {
        const c = stack.pop()!;
        size++;
        const cx = c % cols,
          cy = Math.floor(c / cols);
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nx = cx + dx,
            ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
          const n = ny * cols + nx;
          if (land(n) && comp[n] < 0) {
            comp[n] = sizes.length;
            stack.push(n);
          }
        }
      }
      sizes.push(size);
    }
  }
  // Beach thickness along the coast: beach cells within 6 cells of each coast cell.
  const thick: number[] = [];
  for (let i = 0; i < cols * rows; i++) {
    if (!land(i)) continue;
    const x = i % cols,
      y = Math.floor(i / cols);
    const isCoast =
      (x > 0 && !land(i - 1)) ||
      (x < cols - 1 && !land(i + 1)) ||
      (y > 0 && !land(i - cols)) ||
      (y < rows - 1 && !land(i + cols));
    if (!isCoast) continue;
    let n = 0;
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const nx = x + dx,
          ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        if (land(ny * cols + nx) && biomeAt(map, nx, ny) === Biome.Beach) n++;
      }
    thick.push(n);
  }
  const mean = thick.reduce((a, b) => a + b, 0) / (thick.length || 1),
    sd = Math.sqrt(
      thick.reduce((a, b) => a + (b - mean) ** 2, 0) / (thick.length || 1),
    );
  const big = sizes.filter((s) => s >= 400);
  return {
    land: landCells,
    coastRatio: coast / Math.sqrt(landCells || 1),
    islands: sizes.filter((s) => s >= 6).length,
    small: sizes.filter((s) => s >= 6 && s < 200).length,
    big: big.length,
    beachMean: Math.round(mean * 10) / 10,
    beachCV: Math.round((sd / (mean || 1)) * 100) / 100,
    noBeach:
      Math.round(
        (thick.filter((n) => n === 0).length / (thick.length || 1)) * 100,
      ) / 100,
  };
}
