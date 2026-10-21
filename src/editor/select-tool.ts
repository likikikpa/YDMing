import { objectBounds } from "../extent";
import { hitObject } from "../hit-test";
import { movedPath, nearestPath, pathInBox } from "../path-select";
import type { MapData, Point } from "../types";
import { editable } from "./draft";
import type { EditorCore } from "./useEditorCore";
import type { EditorOverlay } from "./overlay";

export type EditorSelectTool = ReturnType<typeof createSelectTool>;

/**
 * The select tool: pick, move, resize and rotate objects, pick and move
 * rivers, roads and walls, and the marquee.
 */
export function createSelectTool(deps: EditorCore & EditorOverlay) {
  const { latest, view, drag, screenPoint, selectedBounds } = deps;
  /** A press: on a handle of the selection, on an object or path, or on empty map. */
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
    // A path is picked within a few screen pixels of its line, at any zoom.
    const hitLine = hit
      ? undefined
      : nearestPath(m.paths, world, 6 / view.current.scale, (q) =>
          editable(m, q.layer),
        );
    const target = hit || hitLine;
    if (target) {
      let ids = e.shiftKey
        ? [...new Set([...p.selected, target.id])]
        : p.selected.includes(target.id)
          ? p.selected
          : [target.id];
      if (hit?.group)
        ids = m.objects.filter((o) => o.group === hit.group).map((o) => o.id);
      p.setSelected(ids);
      const chosen = new Set(ids);
      drag.current.objects = structuredClone(
        m.objects.filter((o) => chosen.has(o.id) && editable(m, o.layer)),
      );
      drag.current.paths = structuredClone(
        m.paths.filter((q) => chosen.has(q.id) && editable(m, q.layer)),
      );
    } else {
      if (!e.shiftKey) p.setSelected([]);
      drag.current.box = world;
    }
  }
  /** Moves, resizes or rotates the objects being dragged, and moves the paths. */
  function selectMove(e: React.PointerEvent, m: MapData, world: Point) {
    const p = latest.current,
      d = drag.current!;
    const dx = world.x - d.start.x,
      dy = world.y - d.start.y,
      { left, top, right, bottom } = objectBounds(d.objects),
      center = { x: (left + right) / 2, y: (top + bottom) / 2 };
    const boundsWidth = right - left;
    const boundsHeight = bottom - top;
    // Looked up by id once; searching the whole map for each dragged object
    // was quadratic, and this runs on every pointer move.
    const byId = new Map(m.objects.map((o) => [o.id, o]));
    d.objects.forEach((before) => {
      const o = byId.get(before.id)!;
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
    // The draft shares path objects with the saved map, so a moved path is
    // replaced in the draft's own array, never changed in place.
    if (!d.handle)
      for (const before of d.paths ?? []) {
        const i = m.paths.findIndex((q) => q.id === before.id);
        if (i >= 0)
          m.paths[i] = { ...m.paths[i], points: movedPath(before, dx, dy) };
      }
  }
  /** Selects the objects whose centre, and the paths that are wholly, inside the marquee. */
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
    for (const q of m.paths)
      if (editable(m, q.layer) && pathInBox(q, { left, top, right, bottom }))
        ids.push(q.id);
    p.setSelected(e.shiftKey ? [...new Set([...p.selected, ...ids])] : ids);
  }
  return { selectDown, selectMove, selectBox };
}
