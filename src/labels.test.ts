import { describe, expect, it } from "vitest";
import { drawLabel } from "./labels";
import { ornaments } from "./ornaments";
import type { MapData, MapObject } from "./types";

/** Records the order of drawing calls, with the line weight and colour in force. */
function recorder() {
  const calls: {
    call: string;
    arg?: string;
    strokeStyle: string;
    lineWidth: number;
  }[] = [];
  const state: Record<string, unknown> = {
    strokeStyle: "",
    fillStyle: "",
    lineWidth: 1,
    font: "",
    textAlign: "",
    lineJoin: "",
  };
  const ctx = new Proxy(state, {
    get(target, key: string) {
      if (key in target) return target[key];
      if (key === "measureText")
        return (t: string) => ({ width: t.length * 6 });
      return (...args: unknown[]) => {
        calls.push({
          call: key,
          arg: typeof args[0] === "string" ? args[0] : undefined,
          strokeStyle: String(target.strokeStyle),
          lineWidth: Number(target.lineWidth),
        });
        // A gradient is something to add colour stops to.
        if (key === "createRadialGradient") return { addColorStop() {} };
      };
    },
    set(target, key: string, value) {
      target[key] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls, state };
}

const label = {
  id: "l",
  kind: "label",
  name: "BRIARBROOK MARCHES",
  x: 0,
  y: 0,
  width: 260,
  height: 13,
  rotation: 0,
  layer: "Labels",
  color: "#606348",
} as MapObject;

const sheet = (style: string, kind: MapData["kind"] = "world") =>
  ({
    width: 1200,
    height: 850,
    kind,
    settings: { style },
  }) as unknown as MapData;

describe("place-name labels", () => {
  it("are plain text in the inked styles", () => {
    for (const style of ["parchment", "atlas"]) {
      const { ctx, calls, state } = recorder();
      drawLabel(ctx, label, style);
      expect(calls.map((c) => c.call)).toEqual(["fillText"]);
      expect(state.font).toBe("13px Georgia, serif");
      expect(state.fillStyle).toBe("#606348");
    }
  });

  it("are lettered in italic with a paper halo in Old ink", () => {
    const { ctx, calls, state } = recorder();
    drawLabel(ctx, label, "ink");
    expect(calls.map((c) => c.call)).toEqual(["strokeText", "fillText"]);
    expect(state.font).toBe("italic 13px Georgia, serif");
    // The colour of a label is the map-maker's, so ink does not override it.
    expect(state.fillStyle).toBe("#606348");
  });

  it("get a light halo behind them in Painted fantasy, and in maps saved as Painted", () => {
    for (const style of ["fantasy", "painted"]) {
      const { ctx, calls } = recorder();
      drawLabel(ctx, label, style);
      expect(calls.map((c) => c.call)).toEqual(["strokeText", "fillText"]);
      expect(calls[0].lineWidth).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("frame, compass and scale bar", () => {
  const frame = (style: string) => {
    const { ctx, calls } = recorder();
    ornaments(ctx, sheet(style));
    return calls.filter((c) => c.call === "strokeRect");
  };

  it("keep the thin olive frame in the inked styles", () => {
    for (const style of ["parchment", "atlas"]) {
      const [outer, inner] = frame(style);
      expect(outer).toMatchObject({ strokeStyle: "#5e624b66", lineWidth: 1 });
      expect(inner).toMatchObject({ strokeStyle: "#5e624b66", lineWidth: 0.5 });
    }
  });

  it("draw a heavier cream frame in Painted fantasy", () => {
    const [outer, inner] = frame("fantasy");
    expect(outer.strokeStyle).toBe("#f0e6c8c0");
    expect(outer.lineWidth).toBeGreaterThan(1);
    expect(inner.lineWidth).toBeGreaterThan(0.5);
  });

  it("draw Old ink's heavier brown frame", () => {
    const [outer, inner] = frame("ink");
    expect(outer).toMatchObject({ strokeStyle: "#4a3826c8", lineWidth: 1.5 });
    expect(inner.lineWidth).toBeLessThan(outer.lineWidth);
  });

  it("darken the sheet's edges like old paper in Old ink only", () => {
    const edge = (style: string) => {
      const { ctx, calls } = recorder();
      ornaments(ctx, sheet(style));
      return calls.map((c) => c.call);
    };
    const ink = edge("ink");
    expect(ink).toContain("createRadialGradient");
    // The tint goes down before the frame is drawn over it.
    expect(ink.indexOf("fillRect")).toBeLessThan(ink.indexOf("strokeRect"));
    for (const style of ["fantasy", "parchment", "atlas"])
      expect(edge(style)).not.toContain("createRadialGradient");
  });

  it("leave a dungeon's stone untinted even in Old ink", () => {
    const { ctx, calls } = recorder();
    ornaments(ctx, sheet("ink", "dungeon"));
    expect(calls.map((c) => c.call)).not.toContain("createRadialGradient");
  });

  it("leave a dungeon without a compass or a scale bar", () => {
    const { ctx, calls } = recorder();
    ornaments(ctx, sheet("fantasy", "dungeon"));
    expect(calls.some((c) => c.call === "fillText")).toBe(false);
  });

  it("put the unit of the map on its scale bar", () => {
    const { ctx, calls } = recorder();
    ornaments(ctx, sheet("atlas", "city"));
    expect(calls.some((c) => c.call === "fillText" && c.arg === "feet")).toBe(
      true,
    );
  });
});
