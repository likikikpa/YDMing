import { describe, expect, it } from "vitest";
import {
  drawScaleBar,
  SCALE_END,
  SCALE_START,
  scaleBar,
  tickPositions,
} from "./scale-bar";

/** A canvas that records what is drawn; text is 6 px wide per character. */
function recorder() {
  const texts: { text: string; x: number; y: number; align: string }[] = [];
  const ctx = {
    textAlign: "left",
    save() {},
    restore() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    strokeText() {},
    fillText(text: string, x: number, y: number) {
      texts.push({ text, x, y, align: this.textAlign });
    },
    measureText: (text: string) => ({ width: text.length * 6 }),
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, texts };
}

describe("scale bar", () => {
  it("has none on a dungeon, miles on a world and feet on a city", () => {
    expect(scaleBar("dungeon")).toBeUndefined();
    expect(scaleBar("world")?.unit).toBe("miles");
    expect(scaleBar("city")?.unit).toBe("feet");
  });

  it("counts up from zero", () => {
    for (const kind of ["world", "city"] as const) {
      const numbers = scaleBar(kind)!.numbers.map(Number);
      expect(numbers[0]).toBe(0);
      for (let i = 1; i < numbers.length; i++)
        expect(numbers[i]).toBeGreaterThan(numbers[i - 1]);
    }
  });

  it("spaces the ticks evenly from the start of the bar to its end", () => {
    const ticks = tickPositions(3);
    expect(ticks[0]).toBe(SCALE_START);
    expect(ticks[2]).toBe(SCALE_END);
    expect(ticks[1] - ticks[0]).toBeCloseTo(ticks[2] - ticks[1]);
  });

  it("centres each number over its own tick, with the unit after the last", () => {
    const { ctx, texts } = recorder();
    const bar = scaleBar("world")!;
    drawScaleBar(ctx, 850, bar, { text: "#000", line: "#000", lineWidth: 1 });
    const ticks = tickPositions(bar.numbers.length);
    bar.numbers.forEach((n, i) => {
      const drawn = texts.find((t) => t.text === n)!;
      expect(drawn.x).toBe(ticks[i]);
      expect(drawn.align).toBe("center");
    });
    const unit = texts.find((t) => t.text === "miles")!;
    expect(unit.align).toBe("left");
    // Right of the last number's centre, and past its half width of 9 px.
    expect(unit.x).toBeGreaterThan(ticks[2] + 9);
  });
});
