import { hitObject } from "../hit-test";
import type { MapData, Point } from "../types";
import { editable } from "./draft";
import type { EditorCore } from "./useEditorCore";
import type { EditorOverlay } from "./overlay";

export type EditorSelectTool = ReturnType<typeof createSelectTool>;

/** The select tool: pick, move, resize and rotate objects, and the marquee. */
export function createSelectTool(deps: EditorCore & EditorOverlay) {
  const { latest, view, drag, screenPoint, selectedBounds } = deps;
  /** A press: on a handle of the selection, on an object, or on empty map. */
  function selectDown(
    e: React.PointerEvent,
    m: MapData,
    world: Point,
    screen: Point,
  ) {
    const p = latest.current;
    if (!drag.current) return;
    const bounds = selectedBounds();
    if (bounds) {
      const a = screenPoint(bounds),
        w = bounds.w * view.current.scale,
        h = bounds.h * view.current.scale;
      if (Math.hypot(screen.x - a.x - w / 2, screen.y - a.y + 25) < 9)
        drag.current.handle = "rotate";
      else
        for (const [name, x, y] of [
          ["nw", 0, 0],
          ["n", 0.5, 0],
          ["ne", 1, 0],
          ["w", 0, 0.5],
          ["e", 1, 0.5],
          ["sw", 0, 1],
          ["s", 0.5, 1],
          ["se", 1, 1],
        ] as [string, number, number][])
          if (Math.hypot(screen.x - a.x - w * x, screen.y - a.y - h * y) < 9)
            drag.current.handle = name;
      if (drag.current.handle) {
        drag.current.objects = structuredClone(bounds.objects);
        return;
      }
    }
    const hit = [...m.objects]
      .reverse()
      .find((o) => editable(m, o.layer) && hitObject(o, world));
    if (hit) {
      let ids = e.shiftKey
        ? [...new Set([...p.selected, hit.id])]
        : p.selected.includes(hit.id)
          ? p.selected
          : [hit.id];
      if (hit.group)
        ids = m.objects.filter((o) => o.group === hit.group).map((o) => o.id);
      p.setSelected(ids);
      drag.current.objects = structuredClone(
        m.objects.filter((o) => ids.includes(o.id) && editable(m, o.layer)),
      );
    } else {
      if (!e.shiftKey) p.setSelected([]);
      drag.current.box = world;
    }
  }
  /** Moves, resizes or rotates the objects being dragged. */
  function selectMove(e: React.PointerEvent, m: MapData, world: Point) {
    const p = latest.current,
      d = drag.current!;
    const dx = world.x - d.start.x,
      dy = world.y - d.start.y,
      center = {
        x:
          (Math.min(...d.objects.map((o) => o.x - o.width / 2)) +
            Math.max(...d.objects.map((o) => o.x + o.width / 2))) /
          2,
        y:
          (Math.min(...d.objects.map((o) => o.y - o.height / 2)) +
            Math.max(...d.objects.map((o) => o.y + o.height / 2))) /
          2,
      };
    const boundsWidth =
      Math.max(...d.objects.map((o) => o.x + o.width / 2)) -
      Math.min(...d.objects.map((o) => o.x - o.width / 2));
    const boundsHeight =
      Math.max(...d.objects.map((o) => o.y + o.height / 2)) -
      Math.min(...d.objects.map((o) => o.y - o.height / 2));
    d.objects.forEach((before) => {
      const o = m.objects.find((o) => o.id === before.id)!;
      if (d.handle === "rotate") {
        let angle =
          ((Math.atan2(world.y - center.y, world.x - center.x) -
            Math.atan2(d.start.y - center.y, d.start.x - center.x)) *
            180) /
          Math.PI;
        o.rotation =
          before.rotation + (e.shiftKey ? Math.round(angle / 15) * 15 : angle);
        const radians = ((o.rotation - before.rotation) * Math.PI) / 180;
        o.x =
          center.x +
          (before.x - center.x) * Math.cos(radians) -
          (before.y - center.y) * Math.sin(radians);
        o.y =
          center.y +
          (before.x - center.x) * Math.sin(radians) +
          (before.y - center.y) * Math.cos(radians);
      } else if (d.handle) {
        let sx = d.handle.includes("w")
            ? 1 - (dx / boundsWidth) * (e.altKey ? 2 : 1)
            : d.handle.includes("e")
              ? 1 + (dx / boundsWidth) * (e.altKey ? 2 : 1)
              : 1,
          sy = d.handle.includes("n")
            ? 1 - (dy / boundsHeight) * (e.altKey ? 2 : 1)
            : d.handle.includes("s")
              ? 1 + (dy / boundsHeight) * (e.altKey ? 2 : 1)
              : 1;
        if (e.shiftKey) sx = sy = Math.abs(sx - 1) > Math.abs(sy - 1) ? sx : sy;
        sx = Math.max(0.05, sx);
        sy = Math.max(0.05, sy);
        o.width = Math.max(4, before.width * sx);
        o.height = Math.max(4, before.height * sy);
        const anchorX = e.altKey
          ? center.x
          : d.handle.includes("w")
            ? center.x + boundsWidth / 2
            : d.handle.includes("e")
              ? center.x - boundsWidth / 2
              : center.x;
        const anchorY = e.altKey
          ? center.y
          : d.handle.includes("n")
            ? center.y + boundsHeight / 2
            : d.handle.includes("s")
              ? center.y - boundsHeight / 2
              : center.y;
        o.x = anchorX + (before.x - anchorX) * sx;
        o.y = anchorY + (before.y - anchorY) * sy;
      } else {
        o.x = before.x + dx;
        o.y = before.y + dy;
        if (p.brush.snap) {
          const step = m.kind === "dungeon" ? m.width / m.cols : 10;
          o.x = Math.round(o.x / step) * step;
          o.y = Math.round(o.y / step) * step;
        }
      }
    });
  }
  /** Selects the objects whose centre is inside the marquee. */
  function selectBox(e: React.PointerEvent, m: MapData, world: Point) {
    const p = latest.current,
      d = drag.current!;
    const left = Math.min(d.start.x, world.x),
      right = Math.max(d.start.x, world.x),
      top = Math.min(d.start.y, world.y),
      bottom = Math.max(d.start.y, world.y);
    const ids = m.objects
      .filter(
        (o) =>
          editable(m, o.layer) &&
          o.x >= left &&
          o.x <= right &&
          o.y >= top &&
          o.y <= bottom,
      )
      .map((o) => o.id);
    p.setSelected(e.shiftKey ? [...new Set([...p.selected, ...ids])] : ids);
  }
  return { selectDown, selectMove, selectBox };
}
