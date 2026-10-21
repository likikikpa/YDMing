import { keyRoom } from "../generator";
import { random } from "../random";
import { SCULPT_TOOLS, raiseIsland, raiseRange, simplify } from "../sculpt";
import type { CellRect } from "../terrain-render";
import { uid } from "../types";
import { PAINT_TOOLS, editable } from "./draft";
import type { EditorCore } from "./useEditorCore";
import type { EditorOverlay } from "./overlay";
import type { EditorRendering } from "./rendering";
import type { EditorSculpting } from "./sculpting";
import type { EditorStamps } from "./stamps";
import type { EditorPinch } from "./pinch";
import type { EditorSelectTool } from "./select-tool";
import type { EditorFogTool } from "./fog-tool";

export type EditorPointerUp = ReturnType<typeof createPointerUp>;

export function createPointerUp(
  deps: EditorCore &
    EditorOverlay &
    EditorRendering &
    EditorSculpting &
    EditorStamps &
    EditorPinch &
    EditorSelectTool &
    EditorFogTool,
) {
  const {
    latest,
    view,
    draft,
    drag,
    lastPaint,
    touches,
    pinch,
    worldPoint,
    getPoint,
    drawOverlay,
    refresh,
    endSculpt,
    selectBox,
  } = deps;
  function pointerUp(e: React.PointerEvent) {
    if (e.pointerType === "touch") {
      const wasPinching = touches.current.size >= 2;
      touches.current.delete(e.pointerId);
      if (wasPinching) {
        pinch.current = null;
        // The remaining finger must lift and touch again before it draws.
        return;
      }
    }
    const d = drag.current;
    if (!d) return;
    endSculpt();
    const p = latest.current,
      m = draft.current,
      world = worldPoint(getPoint(e));
    if (m && !d.pan) {
      if (d.stroke) lastPaint.current = world;
      let changed = true,
        dirty: CellRect | undefined;
      if (d.box && !["island", "room"].includes(p.tool)) {
        selectBox(e, m, world);
        changed = false;
      } else if (
        (p.tool === "road" || p.tool === "wall") &&
        d.trail &&
        editable(m, "Objects")
      ) {
        const points = simplify([...d.trail, world], 2.5 / view.current.scale);
        if (points.length > 1) {
          const world_ = m.kind === "world";
          m.paths.push({
            id: uid(),
            kind: p.tool,
            points,
            width: Math.max(
              1,
              p.tool === "wall"
                ? world_
                  ? p.brush.size / 16
                  : p.brush.size / 7
                : world_
                  ? p.brush.size / 24
                  : p.brush.size / 5,
            ),
            layer: "Objects",
          });
        } else changed = false;
      } else if (p.tool === "ridge") {
        if (d.trail && d.trail.length > 1 && editable(m, "Terrain"))
          dirty = raiseRange(m, [...d.trail, world], p.brush);
        else changed = false;
      } else if (
        ["island", "room"].includes(p.tool) &&
        !(d.box && editable(m, "Terrain"))
      ) {
        changed = false;
      } else if (p.tool === "island") {
        dirty = raiseIsland(m, d.start, world);
      } else if (p.tool === "room") {
        const cell = m.width / m.cols,
          ch = m.height / m.rows,
          x = Math.floor(Math.min(d.start.x, world.x) / cell),
          y = Math.floor(Math.min(d.start.y, world.y) / ch),
          w = Math.max(1, Math.ceil(Math.abs(world.x - d.start.x) / cell)),
          h = Math.max(1, Math.ceil(Math.abs(world.y - d.start.y) / ch));
        for (let yy = Math.max(0, y); yy < Math.min(m.rows, y + h); yy++)
          for (let xx = Math.max(0, x); xx < Math.min(m.cols, x + w); xx++)
            m.heights[yy * m.cols + xx] = 1;
        const room = {
          id: uid(),
          x: x * cell,
          y: y * ch,
          w: w * cell,
          h: h * ch,
          number: m.rooms.length + 1,
          type: "empty",
          description: "",
        };
        keyRoom(room, m.settings, random(room.id));
        m.rooms.push(room);
        // Floors changed; give the draft its own array so caches rebuild.
        m.heights = m.heights.slice();
      } else if (p.tool === "select") {
        changed = Math.hypot(world.x - d.start.x, world.y - d.start.y) > 0.1;
      } else if (PAINT_TOOLS.includes(p.tool)) {
        changed = !!d.stroke || !!d.erased;
      } else if (SCULPT_TOOLS.includes(p.tool)) {
        changed = d.sculpted === true;
      } else if (p.tool === "fog") {
        changed = d.fogged === true;
      } else if (["stamp", "text", "river"].includes(p.tool)) {
        changed =
          m.objects.length !== p.map.objects.length ||
          m.paths.length !== p.map.paths.length;
      } else if (!["island", "room"].includes(p.tool)) changed = false;
      if (changed)
        p.onChange(
          m,
          p.tool === "select"
            ? "Transform objects"
            : p.tool === "text"
              ? "Add label"
              : `${p.tool.charAt(0).toUpperCase() + p.tool.slice(1)} stroke`,
        );
      drag.current = null;
      draft.current = null;
      refresh(changed ? m : p.map, dirty);
      drawOverlay();
      return;
    }
    drag.current = null;
    draft.current = null;
    refresh();
    drawOverlay();
  }
  return { pointerUp };
}
