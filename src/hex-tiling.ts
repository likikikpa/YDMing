/** Tile texels at one mip level. */
export interface Tile {
  rgb: Float32Array;
  size: number;
  k: number;
}
/** How many blended copies span one tile; more means smaller patches. */
const HEX_SCALE = 1.7;
function latticeHash(x: number, y: number) {
  let h = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  return (h ^ (h >>> 12)) >>> 0;
}
const hexU = [0, 0, 0],
  hexV = [0, 0, 0],
  hexW = [0, 0, 0];
/**
 * Hex tiling (Heitz and Neyret, as simplified by Mikkelsen): the ground is
 * split into a triangle grid, every grid point takes a randomly shifted and
 * turned copy of the tile, and each pixel blends the three copies around it.
 * Blending pulls colours towards the average, so the contrast is restored
 * afterwards. `u` and `v` are in tiles; the result goes into `out`.
 */
export function hexBlend(
  t: Tile,
  mean: number[],
  u: number,
  v: number,
  out: number[],
) {
  const gu = u * HEX_SCALE,
    gv = v * HEX_SCALE,
    sx = gu,
    sy = -0.57735027 * gu + 1.15470054 * gv,
    bx = Math.floor(sx),
    by = Math.floor(sy),
    fx = sx - bx,
    fy = sy - by,
    z = 1 - fx - fy;
  if (z > 0) {
    hexW[0] = z;
    hexW[1] = fy;
    hexW[2] = fx;
    hexU[0] = bx;
    hexV[0] = by;
    hexU[1] = bx;
    hexV[1] = by + 1;
    hexU[2] = bx + 1;
    hexV[2] = by;
  } else {
    hexW[0] = -z;
    hexW[1] = 1 - fy;
    hexW[2] = 1 - fx;
    hexU[0] = bx + 1;
    hexV[0] = by + 1;
    hexU[1] = bx + 1;
    hexV[1] = by;
    hexU[2] = bx;
    hexV[2] = by + 1;
  }
  // Sharper weights keep each copy crisp in the middle of its patch.
  let total = 0;
  for (let n = 0; n < 3; n++) {
    const w = hexW[n];
    total += hexW[n] = w * w * w;
  }
  // Copies with almost no weight are skipped: most of every patch is
  // dominated by one copy, which then needs a single lookup.
  let kept = 0;
  for (let n = 0; n < 3; n++)
    if ((hexW[n] /= total) < 0.03) hexW[n] = 0;
    else kept += hexW[n];
  let squares = 0;
  const mask = t.size - 1;
  out[0] = out[1] = out[2] = 0;
  for (let n = 0; n < 3; n++) {
    if (!hexW[n]) continue;
    const w = hexW[n] / kept,
      h = latticeHash(hexU[n], hexV[n]),
      ox = (h & 1023) / 1024,
      oy = ((h >>> 10) & 1023) / 1024,
      turn = (h >>> 20) & 3,
      ru = turn === 0 ? u : turn === 1 ? -v : turn === 2 ? -u : v,
      rv = turn === 0 ? v : turn === 1 ? u : turn === 2 ? -v : -u,
      // Tiles are a power of two wide, so wrapping is a bit mask.
      tx = Math.floor((ru + ox) * t.size) & mask,
      ty = Math.floor((rv + oy) * t.size) & mask,
      p = (ty * t.size + tx) * 3;
    out[0] += t.rgb[p] * w;
    out[1] += t.rgb[p + 1] * w;
    out[2] += t.rgb[p + 2] * w;
    squares += w * w;
  }
  if (squares > 0.999) return;
  const restore = 1 / Math.sqrt(squares);
  for (let k = 0; k < 3; k++) out[k] = mean[k] + (out[k] - mean[k]) * restore;
}
