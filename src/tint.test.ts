import { describe, expect, it } from "vitest";
import { TINT_STEPS, tintColour, tintStep } from "./tint";

describe("tintStep", () => {
  it("is 0 for no tint, so the picture is drawn as it is", () => {
    expect(tintStep(undefined)).toBe(0);
    expect(tintStep(0)).toBe(0);
    expect(tintStep(-0.1)).toBe(0);
    expect(tintStep(0.1)).toBe(0);
  });
  it("rounds to a step either side and stops at the ends", () => {
    expect(tintStep(1)).toBe(TINT_STEPS);
    expect(tintStep(-1)).toBe(-TINT_STEPS);
    expect(tintStep(40)).toBe(TINT_STEPS);
    expect(tintStep(-0.5)).toBe(-2);
    expect(tintStep(0.4)).toBe(1);
  });
  it("does not break on a broken value", () => {
    expect(tintStep(NaN)).toBe(0);
  });
});

describe("tintColour", () => {
  it("lightens upwards and darkens downwards, stronger further out", () => {
    const alpha = (s: string) => +s.match(/,([\d.]+)\)$/)![1];
    expect(tintColour(1)).toMatch(/^rgba\(255,/);
    expect(tintColour(-1)).toMatch(/^rgba\(24,/);
    expect(alpha(tintColour(3))).toBeGreaterThan(alpha(tintColour(1)));
    expect(alpha(tintColour(-3))).toBeCloseTo(alpha(tintColour(3)));
  });
});
