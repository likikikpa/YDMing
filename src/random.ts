export function hash(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++)
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return h >>> 0;
}
export function random(seed: string) {
  let a = hash(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function value(x: number, y: number, seed: number) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + seed;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
export function noise(x: number, y: number, seed: number) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    fx = x - ix,
    fy = y - iy,
    u = fx * fx * (3 - 2 * fx),
    v = fy * fy * (3 - 2 * fy);
  const a = value(ix, iy, seed),
    b = value(ix + 1, iy, seed),
    c = value(ix, iy + 1, seed),
    d = value(ix + 1, iy + 1, seed);
  return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
}
export function fbm(x: number, y: number, seed: number, octaves = 5) {
  let n = 0,
    a = 0.5,
    total = 0;
  for (let i = 0; i < octaves; i++) {
    n += noise(x, y, seed + i * 997) * a;
    total += a;
    x *= 2;
    y *= 2;
    a *= 0.5;
  }
  return n / total;
}
export const clamp = (v: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
