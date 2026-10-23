import { clamp, lerp } from "./random";
import { spriteImage, spriteSize } from "./stamp-brush";
import type { StampSprite } from "./stamp-brush";
import type { MapObject, Point } from "./types";

/** One picture the scatter brush may place; a larger weight is picked more often. */
export interface ScatterPicture {
  sprite: StampSprite;
  weight?: number;
  /** The most this picture may be turned, in degrees; the options' turn caps it. */
  turn?: number;
}

export interface ScatterOptions {
  /** The brush's radius, in map pixels. */
  radius: number;
  /** The stamp tool's size: the longer side of a stamp at scale 1. */
  size: number;
  /**
   * How much of the painted ground the stamps cover: 1 covers it once, 0.2 a
   * fifth. Bigger stamps therefore come fewer, not piled up.
   */
  density: number;
  /** The smallest and largest scale, as multiples of `size`. */
  scale: readonly [number, number];
  /** Mirror about half of the stamps. */
  flip: boolean;
  /** The largest turn either way, in degrees; 0 keeps every stamp upright. */
  turn: number;
  /** How far the tint may stray, 0 to 1: see `ScatterPlacement.tint`. */
  tint: number;
}

/** Where one scattered stamp goes and how it varies from the others. */
export interface ScatterPlacement extends Point {
  sprite: StampSprite;
  /** Multiple of `ScatterOptions.size`. */
  scale: number;
  rotation: number;
  flipX: boolean;
  /** -1 (darker, cooler) to 1 (lighter, warmer); 0 is the picture as it is. */
  tint: number;
}

/**
 * The most stamps one call places. A huge brush at full density would
 * otherwise add tens of thousands of stamps in a single pointer move.
 */
export const MAX_PER_CALL = 600;

/** The mean of the square of a scale drawn uniformly from the range. */
const meanSquare = ([a, b]: readonly [number, number]) =>
  (a * a + a * b + b * b) / 3;

/** A missing weight counts as 1; a negative or non-numeric one as 0. */
const weightOf = ({ weight = 1 }: ScatterPicture) =>
  Number.isFinite(weight) ? Math.max(0, weight) : 0;

/** A picture chosen by weight, or undefined when there is none to choose. */
export function pickPicture(
  pool: readonly ScatterPicture[],
  rand: () => number,
): ScatterPicture | undefined {
  let total = 0;
  for (const p of pool) total += weightOf(p);
  if (!(total > 0)) return undefined;
  let at = rand() * total;
  for (const p of pool) {
    at -= weightOf(p);
    if (at < 0) return p;
  }
  return pool[pool.length - 1];
}

/** The mean area of the pool's stamps at scale 1, weighted like `pickPicture`. */
function footprint(pool: readonly ScatterPicture[], size: number) {
  let area = 0,
    total = 0;
  for (const p of pool) {
    const w = weightOf(p);
    if (!w) continue;
    const s = spriteSize(p.sprite, size);
    area += w * s.width * s.height;
    total += w;
  }
  return total ? area / total : 0;
}

/** How many stamps to place on `area`, on average (fractions are chances). */
export function expectedCount(
  area: number,
  pool: readonly ScatterPicture[],
  o: ScatterOptions,
) {
  const each = footprint(pool, o.size) * meanSquare(o.scale);
  if (!(each > 0) || !(o.density > 0) || !(area > 0)) return 0;
  return (o.density * area) / each;
}

/** An expected count turned into a whole number: 2.3 gives 2, or 3 three times in ten. */
export function wholeCount(expected: number, rand: () => number) {
  const n = Math.floor(expected);
  return Math.min(MAX_PER_CALL, n + (rand() < expected - n ? 1 : 0));
}

/** A point spread evenly over the disc. */
function inDisc(c: Point, radius: number, rand: () => number): Point {
  const r = radius * Math.sqrt(rand()),
    a = rand() * Math.PI * 2;
  return { x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) };
}

/** Everything about one stamp that is left to chance; the call order never changes. */
function vary(
  at: Point,
  picture: ScatterPicture,
  o: ScatterOptions,
  rand: () => number,
): ScatterPlacement {
  const scale = lerp(o.scale[0], o.scale[1], rand()),
    turn = (rand() * 2 - 1) * Math.min(o.turn, picture.turn ?? o.turn) + 0,
    flipX = rand() < 0.5,
    tint = (rand() * 2 - 1) * clamp(o.tint) + 0;
  return {
    ...at,
    sprite: picture.sprite,
    scale,
    rotation: turn,
    flipX: o.flip && flipX,
    tint,
  };
}

/**
 * The stamps one brush move adds. With no `from` (the first touch) the whole
 * disc under the brush is filled; after that only the ground the brush swept
 * since `from` is, so a slow drag and a fast one leave the same density.
 * `poolAt` narrows the pool by place (what grows on that ground); a spot it
 * gives no pictures for stays empty.
 */
export function scatterStroke(
  from: Point | undefined,
  to: Point,
  pool: readonly ScatterPicture[],
  o: ScatterOptions,
  rand: () => number,
  poolAt?: (at: Point) => readonly ScatterPicture[],
): ScatterPlacement[] {
  const swept = from ? Math.hypot(to.x - from.x, to.y - from.y) : 0,
    area = from ? 2 * o.radius * swept : Math.PI * o.radius * o.radius,
    count = wholeCount(expectedCount(area, pool, o), rand),
    out: ScatterPlacement[] = [];
  for (let i = 0; i < count; i++) {
    const t = rand(),
      centre = from
        ? { x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t) }
        : to,
      at = inDisc(centre, o.radius, rand),
      picture = pickPicture(poolAt ? poolAt(at) : pool, rand);
    if (picture) out.push(vary(at, picture, o, rand));
  }
  return out;
}

/** How the placed stamps join the map. */
export interface ScatterTarget {
  layer: string;
  color: string;
  /** A dungeon's grid square, or 0 on other maps. */
  cell: number;
  id: () => string;
}

/** The map objects for the placements. */
export function scatterObjects(
  placements: readonly ScatterPlacement[],
  size: number,
  target: ScatterTarget,
): MapObject[] {
  const out: MapObject[] = [];
  for (const p of placements) {
    out.push({
      id: target.id(),
      kind: "image",
      ...spriteImage(p.sprite),
      x: p.x,
      y: p.y,
      name: p.sprite.name,
      ...spriteSize(p.sprite, size * p.scale, target.cell),
      rotation: p.rotation,
      ...(p.flipX && { flipX: true }),
      ...(p.tint && { tint: Math.round(p.tint * 100) / 100 }),
      layer: target.layer,
      color: target.color,
      ...(p.sprite.credit && { creditId: p.sprite.credit.id }),
    });
  }
  return out;
}
