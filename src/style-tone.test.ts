import { describe, expect, it } from "vitest";
import { tone } from "./style-tone";

const channels = (css: string) =>
  css.match(/[\d.]+/g)!.map(Number) as [number, number, number, number?];

describe("tone", () => {
  it("leaves every other style's colours alone", () => {
    for (const style of ["fantasy", "ink", "realistic", "drawn", "nonsense"])
      expect(tone(style, "#837d5d")).toBe("#837d5d");
  });

  it("turns Pen & ink colours into neutral grey", () => {
    for (const css of [
      "#837d5d",
      "#8a6c4a99",
      "#606348",
      "#93aaa1",
      "rgb(30, 90, 200)",
    ]) {
      const [r, g, b] = channels(tone("pen", css));
      expect(r).toBe(g);
      expect(g).toBe(b);
    }
  });

  it("keeps alpha, and darkens mid colours so they print as ink", () => {
    expect(tone("pen", "#8a6c4a99")).toMatch(/^rgba\(\d+, \d+, \d+, 0\.6\)$/);
    const [v] = channels(tone("pen", "#837d5d"));
    expect(v).toBeLessThan(80);
    expect(channels(tone("pen", "#000000"))[0]).toBe(0);
    expect(channels(tone("pen", "#ffffff"))[0]).toBeLessThanOrEqual(230);
  });

  it("reads short hex and rgb forms, and returns what it cannot read unchanged", () => {
    expect(tone("pen", "#fff")).toBe(tone("pen", "#ffffff"));
    expect(tone("pen", "rgba(255, 255, 255, 0.5)")).toMatch(/0\.5\)$/);
    expect(tone("pen", "tomato")).toBe("tomato");
    expect(tone("pen", "")).toBe("");
  });
});
