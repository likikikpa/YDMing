import { describe, expect, it } from "vitest";
import { random } from "./random";
import {
  MAX_PER_CALL,
  expectedCount,
  pickPicture,
  scatterObjects,
  scatterStroke,
  wholeCount,
} from "./scatter";
import type { ScatterOptions, ScatterPicture } from "./scatter";

const sprite = (name: string) => ({ src: `/assets/${name}.webp`, name });
const oak = { sprite: sprite("oak") },
  fir = { sprite: sprite("fir") },
  pool: ScatterPicture[] = [oak, fir];
const options: ScatterOptions = {
  radius: 100,
  size: 40,
  density: 0.5,
  scale: [0.5, 1.5],
  flip: true,
  turn: 0,
  tint: 0,
};
const origin = { x: 500, y: 500 };

describe("pickPicture", () => {
  it("follows the weights", () => {
    const rand = random("weights"),
      heavy = [
        { sprite: sprite("a"), weight: 3 },
        { sprite: sprite("b"), weight: 1 },
      ];
    let a = 0;
    for (let i = 0; i < 4000; i++)
      if (pickPicture(heavy, rand)!.sprite.name === "a") a++;
    expect(a / 4000).toBeGreaterThan(0.72);
    expect(a / 4000).toBeLessThan(0.78);
  });
  it("never picks a zero, negative or broken weight", () => {
    const rand = random("zero"),
      list = [
        { sprite: sprite("none"), weight: 0 },
        { sprite: sprite("neg"), weight: -4 },
        { sprite: sprite("nan"), weight: NaN },
        { sprite: sprite("ok") },
      ];
    for (let i = 0; i < 200; i++)
      expect(pickPicture(list, rand)!.sprite.name).toBe("ok");
  });
  it("picks nothing from an empty or weightless pool", () => {
    expect(pickPicture([], random("e"))).toBeUndefined();
    expect(
      pickPicture([{ sprite: sprite("a"), weight: 0 }], random("e")),
    ).toBeUndefined();
  });
});

describe("counts", () => {
  it("keeps the covered share the same for bigger stamps", () => {
    const area = 100_000,
      small = expectedCount(area, pool, options),
      big = expectedCount(area, pool, { ...options, size: 80 });
    expect(small / big).toBeCloseTo(4, 5);
  });
  it("places fewer stamps when they are scaled up", () => {
    const area = 100_000,
      plain = expectedCount(area, pool, { ...options, scale: [1, 1] }),
      large = expectedCount(area, pool, { ...options, scale: [2, 2] });
    expect(plain / large).toBeCloseTo(4, 5);
  });
  it("is zero without density, area or pictures", () => {
    expect(expectedCount(1000, pool, { ...options, density: 0 })).toBe(0);
    expect(expectedCount(0, pool, options)).toBe(0);
    expect(expectedCount(1000, [], options)).toBe(0);
  });
  it("turns a fraction into a chance", () => {
    const rand = random("whole");
    let total = 0;
    for (let i = 0; i < 5000; i++) total += wholeCount(2.3, rand);
    expect(total / 5000).toBeGreaterThan(2.25);
    expect(total / 5000).toBeLessThan(2.35);
  });
  it("caps one call", () => {
    expect(wholeCount(1e9, random("cap"))).toBe(MAX_PER_CALL);
  });
});

describe("scatterStroke", () => {
  it("fills the disc under the first touch", () => {
    const placed = scatterStroke(undefined, origin, pool, options, random("d"));
    expect(placed.length).toBeGreaterThan(0);
    for (const p of placed)
      expect(Math.hypot(p.x - origin.x, p.y - origin.y)).toBeLessThanOrEqual(
        options.radius + 1e-9,
      );
  });
  it("stays within the brush along a drag", () => {
    const to = { x: 900, y: 500 },
      placed = scatterStroke(origin, to, pool, options, random("drag"));
    expect(placed.length).toBeGreaterThan(0);
    for (const p of placed) {
      expect(p.x).toBeGreaterThanOrEqual(origin.x - options.radius);
      expect(p.x).toBeLessThanOrEqual(to.x + options.radius);
      expect(Math.abs(p.y - 500)).toBeLessThanOrEqual(options.radius);
    }
  });
  it("leaves the same density whether the drag is slow or fast", () => {
    const count = (steps: number) => {
      const rand = random("steps");
      let n = 0;
      for (let i = 0; i < steps; i++)
        n += scatterStroke(
          { x: 500 + (i * 4000) / steps, y: 500 },
          { x: 500 + ((i + 1) * 4000) / steps, y: 500 },
          pool,
          options,
          rand,
        ).length;
      return n;
    };
    expect(count(400) / count(40)).toBeGreaterThan(0.93);
    expect(count(400) / count(40)).toBeLessThan(1.07);
  });
  it("places nothing without pictures, density or movement", () => {
    expect(scatterStroke(undefined, origin, [], options, random("x"))).toEqual(
      [],
    );
    expect(
      scatterStroke(
        undefined,
        origin,
        pool,
        { ...options, density: 0 },
        random("x"),
      ),
    ).toEqual([]);
    expect(scatterStroke(origin, origin, pool, options, random("x"))).toEqual(
      [],
    );
  });
  it("is the same for the same seed", () => {
    const run = () =>
      scatterStroke(undefined, origin, pool, options, random("seed"));
    expect(run()).toEqual(run());
  });
  it("varies scale within the range, and only as asked", () => {
    const placed = scatterStroke(
      undefined,
      origin,
      pool,
      { ...options, density: 4, turn: 0, tint: 0, flip: false },
      random("vary"),
    );
    expect(placed.length).toBeGreaterThan(20);
    for (const p of placed) {
      expect(p.scale).toBeGreaterThanOrEqual(0.5);
      expect(p.scale).toBeLessThanOrEqual(1.5);
      expect(p.rotation).toBe(0);
      expect(p.tint).toBe(0);
      expect(p.flipX).toBe(false);
    }
    expect(new Set(placed.map((p) => p.scale)).size).toBeGreaterThan(10);
  });
  it("turns, flips and tints within the limits", () => {
    const placed = scatterStroke(
      undefined,
      origin,
      pool,
      { ...options, density: 4, turn: 25, tint: 0.4, flip: true },
      random("all"),
    );
    expect(placed.some((p) => p.flipX)).toBe(true);
    expect(placed.some((p) => !p.flipX)).toBe(true);
    for (const p of placed) {
      expect(Math.abs(p.rotation)).toBeLessThanOrEqual(25);
      expect(Math.abs(p.tint)).toBeLessThanOrEqual(0.4);
    }
    expect(placed.some((p) => p.rotation > 0)).toBe(true);
    expect(placed.some((p) => p.rotation < 0)).toBe(true);
  });
  it("uses every picture of the pool", () => {
    const placed = scatterStroke(
      undefined,
      origin,
      pool,
      { ...options, density: 4 },
      random("mix"),
    );
    expect(new Set(placed.map((p) => p.sprite.name))).toEqual(
      new Set(["oak", "fir"]),
    );
  });
});

describe("scatterObjects", () => {
  const target = {
    layer: "Objects",
    color: "#112233",
    cell: 0,
    id: (() => {
      let n = 0;
      return () => `s${n++}`;
    })(),
  };
  it("makes sized, upright image stamps that refer to their picture", () => {
    const [a] = scatterObjects(
      [
        {
          x: 10,
          y: 20,
          sprite: sprite("oak"),
          scale: 2,
          rotation: 12,
          flipX: true,
          tint: 0.3,
        },
      ],
      40,
      target,
    );
    expect(a).toMatchObject({
      kind: "image",
      image: "/assets/oak.webp",
      x: 10,
      y: 20,
      name: "oak",
      width: 80,
      height: 80,
      rotation: 12,
      flipX: true,
      layer: "Objects",
      color: "#112233",
    });
    expect(a).not.toHaveProperty("imageId");
  });
  it("leaves out flipX when not mirrored", () => {
    const [a] = scatterObjects(
      [
        {
          x: 0,
          y: 0,
          sprite: sprite("oak"),
          scale: 1,
          rotation: 0,
          flipX: false,
          tint: 0,
        },
      ],
      40,
      target,
    );
    expect(a).not.toHaveProperty("flipX");
  });
  it("refers to an imported picture by id, never by data", () => {
    const [a] = scatterObjects(
      [
        {
          x: 0,
          y: 0,
          sprite: {
            src: "data:image/png;base64,AAAA",
            name: "mine",
            imageId: "img1",
          },
          scale: 1,
          rotation: 0,
          flipX: false,
          tint: 0,
        },
      ],
      40,
      target,
    );
    expect(a.imageId).toBe("img1");
    expect(a.image).toBeUndefined();
  });
  it("handles a very large number of stamps", () => {
    const placements = Array.from({ length: 200_000 }, (_, i) => ({
      x: i,
      y: i,
      sprite: sprite("oak"),
      scale: 1,
      rotation: 0,
      flipX: false,
      tint: 0,
    }));
    expect(scatterObjects(placements, 40, target)).toHaveLength(200_000);
  });
});
