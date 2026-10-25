import { describe, expect, it } from "vitest";
import { generateMap } from "./generator";
import { featureBend, letteredWidth, regionLettering } from "./label-lettering";
import { defaultSettings } from "./types";

describe("lettering of generated names", () => {
  it("puts realms and seas in spaced capitals, Cinzel except on old paper", () => {
    expect(regionLettering("fantasy", "sea")).toMatchObject({
      font: "cinzel",
      height: 17,
    });
    expect(regionLettering("ink", "realm").font).toBeUndefined();
    expect(regionLettering("ink", "realm").spacing).toBeGreaterThan(0.2);
    expect(regionLettering("fantasy", "forest").font).toBeUndefined();
  });

  it("estimates wider names for wider faces and more spacing", () => {
    const name = { name: "SEA OF ULF", height: 17 };
    const plain = letteredWidth(name, "fantasy");
    expect(
      letteredWidth({ ...name, font: "uncial" }, "fantasy"),
    ).toBeGreaterThan(plain);
    expect(letteredWidth({ ...name, spacing: 0.3 }, "fantasy")).toBeCloseTo(
      plain + 0.3 * 17 * 9,
    );
  });

  it("bends a name to follow a range that arches or sags", () => {
    // Cells along a parabola on a 60-wide grid (canvas y grows downward):
    // `arch` has its ends lower on the page than its middle, `sag` higher.
    const cols = 60,
      sag: number[] = [],
      arch: number[] = [];
    for (let x = 5; x <= 55; x++) {
      const bow = Math.round(((x - 30) * (x - 30)) / 30);
      arch.push((10 + bow) * cols + x);
      sag.push((40 - bow) * cols + x);
    }
    const middle = (cells: number[]) =>
      cells.reduce((a, c) => a + Math.floor(c / cols), 0) / cells.length;
    expect(featureBend(arch, cols, 30, middle(arch), 0, 40)).toBeGreaterThan(0);
    expect(featureBend(sag, cols, 30, middle(sag), 0, 40)).toBeLessThan(0);
    // A straight band gives a straight name.
    const straight = Array.from({ length: 50 }, (_, i) => 20 * cols + 5 + i);
    expect(featureBend(straight, cols, 30, 20, 0, 40)).toBe(0);
  });

  it("keeps every realm's name inside the map", () => {
    // Seeds whose capitals stand near the left or right edge.
    for (const seed of ["CHARLIE", "GOLF"]) {
      const map = generateMap("world", { ...defaultSettings, seed });
      for (const o of map.objects.filter((o) => o.id.startsWith("region-")))
        if (!o.id.startsWith("region-feature")) {
          expect(o.x - o.width / 2).toBeGreaterThanOrEqual(0);
          expect(o.x + o.width / 2).toBeLessThanOrEqual(map.width);
        }
    }
  });
});
