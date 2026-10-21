import { useImperativeHandle } from "react";
import type { ForwardedRef } from "react";
import type { EditorHandle } from "./types";
import { drawMap } from "../render";
import { clamp } from "../random";
import { riverThrough } from "../rivers";
import { uid } from "../types";
import { beginDraft, editable } from "./draft";
import type { EditorCore } from "./useEditorCore";
import type { EditorOverlay } from "./overlay";
import type { EditorRendering } from "./rendering";

export function useEditorHandle(
  ref: ForwardedRef<EditorHandle>,
  deps: EditorCore & EditorOverlay & EditorRendering,
) {
  const {
    latest,
    riverPoints,
    size,
    setRiverPoints,
    fit,
    refresh,
    zoomAt,
    worldPoint,
  } = deps;
  useImperativeHandle(ref, () => ({
    fit,
    zoom: (f) => zoomAt(f, { x: size.current.w / 2, y: size.current.h / 2 }),
    viewCentre: () => {
      const m = latest.current.map,
        at = worldPoint({ x: size.current.w / 2, y: size.current.h / 2 });
      return { x: clamp(at.x, 0, m.width), y: clamp(at.y, 0, m.height) };
    },
    finishRiver: () => {
      const p = latest.current,
        river =
          editable(p.map, "Water") &&
          riverThrough(
            riverPoints.current,
            p.map.paths.filter((q) => q.kind === "river"),
            uid(),
          );
      if (river) {
        const m = beginDraft(p.map, "river");
        m.paths.push(river);
        p.onChange(m, "River");
        refresh(m);
      }
      setRiverPoints([]);
    },
    cancelRiver: () => setRiverPoints([]),
    undoRiverPoint: () => setRiverPoints(riverPoints.current.slice(0, -1)),
    exportCanvas: (player, scale, fog = true) => {
      const canvas = document.createElement("canvas");
      canvas.width = latest.current.map.width * scale;
      canvas.height = latest.current.map.height * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(scale, scale);
      drawMap(
        ctx,
        fog ? latest.current.map : { ...latest.current.map, fog: undefined },
        {
          player,
          contours: latest.current.contours,
          vector: true,
        },
      );
      return canvas;
    },
  }));
}
