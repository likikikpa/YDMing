import { clamp } from "../random";
import { drawMap } from "../render";
import { unionRects } from "../sculpt";
import { terrainView } from "../terrain";
import { startTerrainDetail } from "../terrain-render";
import type { CellRect } from "../terrain-render";
import type { MapData, Point } from "../types";
import { dirtyArea, unionAreas } from "./areas";
import { makeTiles } from "./gpu-tiles";
import type { Area, Frame } from "./types";
import type { EditorCore } from "./useEditorCore";
import type { EditorOverlay } from "./overlay";

export type EditorRendering = ReturnType<typeof createRendering>;

export function createRendering(deps: EditorCore & EditorOverlay) {
  const {
    application,
    sprite,
    tiles,
    mapCanvas,
    latest,
    view,
    drag,
    lastStatus,
    detail,
    detailTimer,
    detailJob,
    queued,
    frame,
    statusFrame,
    size,
    worldPoint,
    drawOverlay,
  } = deps;
  // Status text changes on every mouse move; React only needs the latest value once per frame.
  const reportStatus = () => {
    if (statusFrame.current) return;
    // About 20 updates a second is plenty for a coordinate read-out, and it
    // keeps the large side panel from re-rendering on every mouse move.
    statusFrame.current = window.setTimeout(() => {
      statusFrame.current = 0;
      latest.current.onStatus({
        ...lastStatus.current,
        zoom: view.current.scale * 100,
      });
    }, 50);
  };
  const fit = () => {
    const m = latest.current.map;
    const scale = Math.min(
      (size.current.w - 40) / m.width,
      (size.current.h - 40) / m.height,
    );
    view.current = {
      scale: Math.max(0.1, scale),
      x: (size.current.w - m.width * scale) / 2,
      y: (size.current.h - m.height * scale) / 2,
    };
    position();
  };
  const position = () => {
    if (sprite.current) {
      sprite.current.position.set(view.current.x, view.current.y);
      sprite.current.scale.set(view.current.scale);
      application.current?.render();
    }
    drawOverlay();
    reportStatus();
    // The 1x bitmap is only a stand-in while the view moves; once it settles
    // the visible part is redrawn at screen resolution.
    if (detail.current) detail.current.style.display = "none";
    detailJob.current++;
    window.clearTimeout(detailTimer.current);
    detailTimer.current = window.setTimeout(renderDetail, 220);
  };
  /**
   * Redraws the visible part of the map sharply at the current zoom. The
   * terrain pixels are painted a few rows per task so pinching and panning
   * stay smooth; any view change abandons the job and starts over.
   */
  function renderDetail() {
    const canvas = detail.current;
    if (!canvas || drag.current || !sprite.current) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2),
      v = view.current;
    if (v.scale * dpr < 1.1) return;
    const m = latest.current.map,
      w = Math.round(size.current.w * dpr),
      h = Math.round(size.current.h * dpr),
      job = ++detailJob.current,
      landscape =
        m.kind !== "dungeon" ? m : m.terrain ? terrainView(m) : undefined,
      // Terrain is painted at no more than 1.5 pixels per screen point;
      // lines, labels and symbols are still drawn at full resolution.
      terrain =
        landscape &&
        startTerrainDetail(
          landscape,
          { a: v.scale * dpr, e: v.x * dpr, f: v.y * dpr },
          w,
          h,
          v.scale * Math.min(dpr, 1.5),
        );
    const finish = () => {
      if (job !== detailJob.current || drag.current) return;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const ctx = canvas.getContext("2d")!;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.setTransform(
        v.scale * dpr,
        0,
        0,
        v.scale * dpr,
        v.x * dpr,
        v.y * dpr,
      );
      ctx.imageSmoothingQuality = "high";
      drawMap(ctx, latest.current.map, {
        contours: latest.current.contours,
        player: latest.current.player,
        vector: true,
        terrainDetail: terrain,
      });
      canvas.style.display = "block";
    };
    const work = () => {
      if (job !== detailJob.current || drag.current) return;
      if (!terrain || terrain.step(8)) finish();
      else window.setTimeout(work, 0);
    };
    work();
  }
  /** Draws the map now and uploads the changed part to the GPU. */
  const render = (f: Frame) => {
    const canvas = mapCanvas.current;
    let resized = false;
    if (canvas.width !== f.map.width || canvas.height !== f.map.height) {
      canvas.width = f.map.width;
      canvas.height = f.map.height;
      resized = true;
    }
    // A terrain edit changes only the cells under the brush, plus the
    // coastlines and symbols that reach a little past them.
    const area =
      resized || !tiles.current.length
        ? undefined
        : f.dirty
          ? dirtyArea(f.map, f.dirty)
          : f.area;
    drawMap(canvas.getContext("2d")!, f.map, {
      contours: latest.current.contours,
      player: latest.current.player,
      dirty: f.dirty,
      liveStroke: f.live,
      clip: area,
    });
    const stage = sprite.current;
    if (stage) {
      if (resized || !tiles.current.length) {
        for (const t of tiles.current)
          t.sprite.destroy({ texture: true, textureSource: true });
        tiles.current = makeTiles(canvas.width, canvas.height);
        for (const t of tiles.current) stage.addChild(t.sprite);
      }
      for (const t of tiles.current)
        if (
          !area ||
          (t.x < area.x + area.w &&
            t.x + t.canvas.width > area.x &&
            t.y < area.y + area.h &&
            t.y + t.canvas.height > area.y)
        ) {
          const c = t.canvas.getContext("2d")!;
          c.clearRect(0, 0, t.canvas.width, t.canvas.height);
          c.drawImage(canvas, -t.x, -t.y);
          t.sprite.texture.source.update();
        }
      position();
    }
  };
  /** Queues a redraw for the next animation frame, merging pending changes. */
  const refresh = (
    m: MapData = latest.current.map,
    dirty?: CellRect,
    live?: string,
    area?: Area,
  ) => {
    const pending = queued.current,
      same = m === pending?.map;
    queued.current = {
      map: m,
      dirty: same ? unionRects(pending?.dirty, dirty) : dirty,
      live: live ?? (same ? pending?.live : undefined),
      // Only frames that all name their area can skip the full redraw.
      area: pending
        ? same
          ? unionAreas(pending.area, area)
          : undefined
        : area,
    };
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const next = queued.current;
      queued.current = null;
      if (next && sprite.current) render(next);
    });
  };
  function zoomAt(factor: number, p: Point) {
    const before = worldPoint(p),
      scale = clamp(view.current.scale * factor, 0.12, 5);
    view.current = {
      scale,
      x: p.x - before.x * scale,
      y: p.y - before.y * scale,
    };
    position();
  }
  return { reportStatus, fit, position, renderDetail, render, refresh, zoomAt };
}
