import { eraseAt } from "../erase";
import { hitObject } from "../hit-test";
import { clamp } from "../random";
import { SCULPT_TOOLS } from "../sculpt";
import { editableTerrain } from "../terrain";
import { uid } from "../types";
import type { MapObject, Stroke } from "../types";
import { PAINT_TOOLS, beginDraft, editable } from "./draft";
import type { EditorCore } from "./useEditorCore";
import type { EditorOverlay } from "./overlay";
import type { EditorRendering } from "./rendering";
import type { EditorSculpting } from "./sculpting";
import type { EditorStamps } from "./stamps";
import type { EditorPinch } from "./pinch";

export type EditorPointerDown = ReturnType<typeof createPointerDown>;

export function createPointerDown(
  deps: EditorCore &
    EditorOverlay &
    EditorRendering &
    EditorSculpting &
    EditorStamps &
    EditorPinch,
) {
  const {
    mapCanvas,
    latest,
    view,
    space,
    draft,
    drag,
    lastPaint,
    riverPoints,
    touches,
    sculpt,
    screenPoint,
    worldPoint,
    getPoint,
    setRiverPoints,
    selectedBounds,
    drawOverlay,
    refresh,
    sculptFrame,
    endSculpt,
    placeStamp,
    pinchStart,
  } = deps;
  function pointerDown(e: React.PointerEvent) {
    if (e.pointerType === "touch") {
      e.currentTarget.setPointerCapture(e.pointerId);
      touches.current.set(e.pointerId, getPoint(e));
      if (touches.current.size >= 2) {
        // A second finger turns the touch into a gesture: drop what the
        // first finger had started instead of committing a stray mark.
        // Terrain it already changed is repainted for that area only; an
        // untouched map needs no redraw at all.
        const started = drag.current,
          sculpting = SCULPT_TOOLS.includes(latest.current.tool);
        endSculpt(true);
        drag.current = null;
        draft.current = null;
        if (!sculpting) refresh();
        else if (started?.sculptDirty)
          refresh(latest.current.map, started.sculptDirty);
        pinchStart();
        drawOverlay();
        return;
      }
    }
    if (e.button !== 0 && e.button !== 1) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = latest.current,
      screen = getPoint(e),
      world = worldPoint(screen);
    const pan = e.button === 1 || space.current || p.tool === "hand";
    drag.current = {
      start: world,
      last: world,
      screen,
      pan,
      objects: [],
      handle: "",
    };
    if (pan) return;
    if (
      world.x < 0 ||
      world.y < 0 ||
      world.x > p.map.width ||
      world.y > p.map.height
    ) {
      drag.current = null;
      return;
    }
    if (e.altKey || p.tool === "eyedropper") {
      const ctx = mapCanvas.current.getContext("2d")!,
        data = ctx.getImageData(
          Math.floor(world.x),
          Math.floor(world.y),
          1,
          1,
        ).data;
      p.onColor(
        "#" +
          [...data]
            .slice(0, 3)
            .map((v) => v.toString(16).padStart(2, "0"))
            .join(""),
      );
      drag.current = null;
      return;
    }
    draft.current = beginDraft(p.map, p.tool);
    const m = draft.current;
    if (p.tool === "select") {
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
      return;
    }
    if (SCULPT_TOOLS.includes(p.tool)) {
      if (!editable(m, "Terrain")) {
        draft.current = null;
        drag.current = null;
        return;
      }
      const terrain = editableTerrain(m);
      drag.current.flat =
        terrain.heights[
          clamp(Math.floor((world.y / m.height) * m.rows), 0, m.rows - 1) *
            m.cols +
            clamp(Math.floor((world.x / m.width) * m.cols), 0, m.cols - 1)
        ];
      sculpt.current = {
        pos: world,
        last: world,
        time: performance.now() - 16,
        pressure:
          e.pointerType === "pen" && p.brush.pressure ? e.pressure * 2 : 1,
        frame: 0,
      };
      // Paints the first dab at once (a tap already leaves a visible mark);
      // the loop then keeps going every frame. A finger waits a moment in
      // case a second one turns the touch into a pinch.
      sculpt.current.time = performance.now() - 120;
      if (e.pointerType === "touch") {
        sculpt.current.holdUntil = performance.now() + 90;
        sculpt.current.frame = requestAnimationFrame(sculptFrame);
      } else sculptFrame(performance.now());
      drawOverlay(screen);
      return;
    } else if (PAINT_TOOLS.includes(p.tool)) {
      if (p.tool === "eraser") {
        // The eraser also lifts stamps, labels and whole paths, even when
        // the active paint layer itself cannot be erased.
        drag.current.erased = eraseAt(m, world, p.brush.size / 2, (l) =>
          editable(m, l),
        );
        if (!editable(m, p.brush.layer)) {
          refresh(m);
          drawOverlay(screen);
          return;
        }
      } else if (!editable(m, p.brush.layer)) return;
      const stroke: Stroke = {
        id: uid(),
        points:
          e.shiftKey &&
          lastPaint.current &&
          ["brush", "pencil"].includes(p.tool)
            ? [lastPaint.current, world]
            : [world],
        tool: p.tool as Stroke["tool"],
        color: p.brush.color,
        size:
          p.brush.size *
          (e.pointerType === "pen" && p.brush.pressure
            ? Math.max(0.1, e.pressure)
            : 1),
        opacity: p.brush.opacity / 100,
        hardness: p.brush.hardness / 100,
        layer: p.brush.layer,
      };
      if (p.brush.mask) {
        const layer = m.layers.find((l) => l.id === p.brush.layer)!;
        layer.mask ??= [];
        layer.mask.push(stroke);
      } else m.strokes.push(stroke);
      drag.current.stroke = stroke;
      refresh(m, undefined, p.brush.mask ? undefined : stroke.id);
    } else if (p.tool === "stamp") {
      placeStamp(world);
      refresh(m);
    } else if (p.tool === "text") {
      if (editable(m, "Labels")) {
        const o: MapObject = {
          id: uid(),
          kind: "label",
          x: world.x,
          y: world.y,
          name: "New label",
          width: 200,
          height: 20,
          rotation: 0,
          layer: "Labels",
          color: p.brush.color,
        };
        m.objects.push(o);
        p.setSelected([o.id]);
        refresh(m);
      }
    } else if (p.tool === "river" && editable(m, "Water")) {
      // Every click adds a point. Nothing is drawn until the river is
      // approved, so the person can place as many bends as they like.
      setRiverPoints([...riverPoints.current, world]);
    } else if (["road", "wall", "ridge"].includes(p.tool)) {
      drag.current.trail = [world];
    }
    drawOverlay(screen);
  }
  return { pointerDown };
}
