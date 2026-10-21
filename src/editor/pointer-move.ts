import { eraseAt } from "../erase";
import { biomeAt } from "../generator";
import { clamp } from "../random";
import { isScatterSprite } from "../symbols";
import { terrainView } from "../terrain";
import { areaAround } from "./areas";
import { editable } from "./draft";
import type { Area } from "./types";
import type { EditorCore } from "./useEditorCore";
import type { EditorOverlay } from "./overlay";
import type { EditorRendering } from "./rendering";
import type { EditorSculpting } from "./sculpting";
import type { EditorStamps } from "./stamps";
import type { EditorPinch } from "./pinch";

export type EditorPointerMove = ReturnType<typeof createPointerMove>;

export function createPointerMove(
  deps: EditorCore &
    EditorOverlay &
    EditorRendering &
    EditorSculpting &
    EditorStamps &
    EditorPinch,
) {
  const {
    latest,
    view,
    draft,
    drag,
    lastStatus,
    touches,
    sculpt,
    worldPoint,
    getPoint,
    drawOverlay,
    reportStatus,
    position,
    refresh,
    placeStamp,
    pinchMove,
  } = deps;
  function pointerMove(e: React.PointerEvent) {
    if (e.pointerType === "touch" && touches.current.has(e.pointerId)) {
      touches.current.set(e.pointerId, getPoint(e));
      if (touches.current.size >= 2) {
        pinchMove();
        return;
      }
    }
    const p = latest.current,
      screen = getPoint(e),
      world = worldPoint(screen),
      m = draft.current || p.map;
    const gx = clamp(Math.floor((world.x / m.width) * m.cols), 0, m.cols - 1),
      gy = clamp(Math.floor((world.y / m.height) * m.rows), 0, m.rows - 1),
      landscape = terrainView(m),
      h = landscape.heights[gy * m.cols + gx] || 0;
    lastStatus.current = {
      zoom: view.current.scale * 100,
      x: Math.round(world.x),
      y: Math.round(world.y),
      height: Math.round((h - m.settings.seaLevel) * 8000),
      biome: biomeAt(landscape, gx, gy),
    };
    reportStatus();
    const d = drag.current;
    if (!d) {
      drawOverlay(screen);
      return;
    }
    if (d.pan) {
      view.current.x += screen.x - d.screen.x;
      view.current.y += screen.y - d.screen.y;
      d.screen = screen;
      position();
      return;
    }
    if (!draft.current) return;
    if (sculpt.current) {
      // The animation loop paints; the pointer only says where.
      sculpt.current.pos = world;
      if (e.pointerType === "pen" && p.brush.pressure)
        sculpt.current.pressure = e.pressure * 2;
      drawOverlay(screen);
      return;
    }
    if (d.box) {
      d.box = world;
      drawOverlay(screen);
      return;
    }
    let removed = false,
      paintArea: Area | undefined;
    if (p.tool === "eraser") {
      const things = m.objects.length + m.paths.length;
      // Steps along the drag so a fast swipe cannot skip over a stamp.
      const step = Math.max(2, p.brush.size / 4),
        n = Math.ceil(
          Math.hypot(world.x - d.last.x, world.y - d.last.y) / step,
        );
      for (let k = 1; k <= n; k++) {
        const at = {
          x: d.last.x + ((world.x - d.last.x) * k) / n,
          y: d.last.y + ((world.y - d.last.y) * k) / n,
        };
        if (eraseAt(m, at, p.brush.size / 2, (l) => editable(m, l)))
          d.erased = true;
      }
      // Stamps and whole paths can reach far beyond the brush.
      removed = m.objects.length + m.paths.length !== things;
      d.last = world;
    }
    if (p.tool === "select" && d.objects.length) {
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
            before.rotation +
            (e.shiftKey ? Math.round(angle / 15) * 15 : angle);
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
          if (e.shiftKey)
            sx = sy = Math.abs(sx - 1) > Math.abs(sy - 1) ? sx : sy;
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
    } else if (d.stroke) {
      const before = d.stroke.points,
        from = before.length;
      if (["line", "rectangle", "ellipse"].includes(p.tool)) {
        d.stroke.points = [d.start, world];
        // A shape is redrawn whole, so the area covers its old and new extent.
        paintArea = areaAround(
          [d.start, before[before.length - 1], world],
          d.stroke.size + 4,
        );
      } else {
        // Every pointer sample since the last frame, so fast strokes stay smooth.
        const samples = e.nativeEvent.getCoalescedEvents?.() ?? [];
        if (samples.length > 1)
          for (const s of samples)
            d.stroke.points.push(worldPoint(getPoint(s)));
        else d.stroke.points.push(world);
        // Only the new stretch of the stroke, plus the eraser's reach into
        // generated mountains and forests, changes on screen.
        paintArea = areaAround(
          d.stroke.points.slice(from - 1),
          d.stroke.size + (p.tool === "eraser" ? 74 : 4),
        );
      }
    } else if (
      p.tool === "stamp" &&
      (p.brush.sprite
        ? isScatterSprite(p.brush.sprite.src)
        : ["tree", "pine"].includes(p.brush.stamp)) &&
      Math.hypot(world.x - d.last.x, world.y - d.last.y) > p.brush.size * 0.45
    ) {
      placeStamp(world);
      d.last = world;
    } else if (d.trail) {
      const last = d.trail[d.trail.length - 1];
      if (Math.hypot(world.x - last.x, world.y - last.y) > 4)
        d.trail.push(world);
      drawOverlay(screen);
      return;
    } else if (["island", "room"].includes(p.tool)) {
      d.box = world;
      drawOverlay(screen);
      return;
    }
    refresh(
      m,
      undefined,
      d.stroke && !p.brush.mask ? d.stroke.id : undefined,
      p.brush.mask || removed || p.tool === "fill" ? undefined : paintArea,
    );
    drawOverlay(screen);
  }
  return { pointerMove };
}
