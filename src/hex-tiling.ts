/** Tile texels at one mip level. */
export interface Tile {
  rgb: Float32Array;
  size: number;
  k: number;
  /** Which quarter turns a copy may take: `ANY_TURN`, or `HALF_TURNS` for a directional tile. */
  turns: number;
}
export const ANY_TURN = 3,
  HALF_TURNS = 2;
/** A tile with more coherence than this has detail that lines up: ripples, grain, stripes. */
export const DIRECTIONAL = 0.5;
/**
 * How parallel the detail of a tile is, from 0 for noise that runs every way
 * to 1 for straight stripes: the share of the gradients that points one way
 * (the structure tensor). The tile wraps, so its gradients do too.
 */
export function coherence(rgb: Float32Array, size: number) {
  if (size < 2 || rgb.length !== size * size * 3) return 0;
  const lum = (i: number) =>
    rgb[i * 3] * 0.3 + rgb[i * 3 + 1] * 0.59 + rgb[i * 3 + 2] * 0.11;
  let xx = 0,
    yy = 0,
    xy = 0;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const gx =
          lum(y * size + ((x + 1) % size)) -
          lum(y * size + ((x + size - 1) % size)),
        gy =
          lum(((y + 1) % size) * size + x) -
          lum(((y + size - 1) % size) * size + x);
      xx += gx * gx;
      yy += gy * gy;
      xy += gx * gy;
    }
  return xx + yy > 0 ? Math.hypot(xx - yy, 2 * xy) / (xx + yy) : 0;
}
/** The turns a tile's copies may take: only half turns for a directional one. */
export const turnsFor = (rgb: Float32Array, size: number) =>
  coherence(rgb, size) > DIRECTIONAL ? HALF_TURNS : ANY_TURN;
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
      // A quarter turn would lay ripples across their neighbours; a half turn
      // keeps them running the same way, so patches join without a line.
      turn = (h >>> 20) & 3 & t.turns,
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
