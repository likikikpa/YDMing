import { random } from "../random";
import { scatterObjects, scatterStroke } from "../scatter";
import { scatterOptions } from "../scatter-brush";
import { poolAtMap } from "../scatter-habitat";
import { extent } from "../extent";
import { uid } from "../types";
import type { MapData, Point } from "../types";
import { editable } from "./draft";
import type { Area } from "./types";
import type { EditorCore } from "./useEditorCore";

export type EditorScatterTool = ReturnType<typeof createScatterTool>;

/**
 * The stamp tool's scatter mode: a brush that sows stamps from a pool of
 * pictures as it moves. Each press and drag returns the map pixels it
 * changed, so only that part of the map is redrawn.
 */
export function createScatterTool(deps: EditorCore) {
  const { latest, drag } = deps;

  /** Whether the stamp tool is scattering on this map right now. */
  function scatterActive() {
    const p = latest.current;
    return (
      p.tool === "stamp" &&
      p.map.kind === "world" &&
      !!p.brush.scatter?.on &&
      !!p.scatterPool?.length
    );
  }

  /** Sows the ground the brush covered from `from` (or the disc under it) to `to`. */
  function sow(m: MapData, from: Point | undefined, to: Point) {
    const p = latest.current,
      d = drag.current,
      b = p.brush,
      pool = p.scatterPool;
    if (!d || !pool?.length || !b.scatter || !editable(m, b.layer))
      return undefined;
    d.rand ??= random(uid());
    const placed = scatterStroke(
      from,
      to,
      pool,
      scatterOptions(b.scatter, b.size),
      d.rand,
      b.scatter.biomes ? poolAtMap(m, pool) : undefined,
    );
    const inside = placed.filter(
      (s) => s.x >= 0 && s.y >= 0 && s.x <= m.width && s.y <= m.height,
    );
    if (!inside.length) return undefined;
    const added = scatterObjects(inside, b.size, {
      layer: b.layer,
      color: b.color,
      cell: 0,
      id: uid,
    });
    // The new stamps are not spread into `push`: a big brush adds hundreds.
    for (const o of added) m.objects.push(o);
    const xs: number[] = [],
      ys: number[] = [];
    for (const o of added) {
      const r = Math.hypot(o.width, o.height) / 2;
      xs.push(o.x - r, o.x + r);
      ys.push(o.y - r, o.y + r);
    }
    const x = extent(xs),
      y = extent(ys);
    return {
      x: Math.floor(x.min),
      y: Math.floor(y.min),
      w: Math.ceil(x.max - x.min) + 1,
      h: Math.ceil(y.max - y.min) + 1,
    } satisfies Area;
  }

  /** A press: sows the disc under the brush. */
  const scatterDown = (m: MapData, world: Point) => sow(m, undefined, world);

  /** A drag: sows only the ground swept since the last move. */
  function scatterMove(m: MapData, world: Point) {
    const d = drag.current;
    if (!d) return undefined;
    const area = sow(m, d.last, world);
    d.last = world;
    return area;
  }
  return { scatterActive, scatterDown, scatterMove };
}
