import type { EditorProps } from "./types";
import { useRef, useState } from "react";
import type { FogGrid } from "../fog";
import type { CellRect } from "../terrain-render";
import type { MapData, MapObject, MapPath, Point, Stroke } from "../types";
import type { GpuTile } from "./gpu-tiles";
import type { Frame, View } from "./types";
import { Application, Container } from "pixi.js";

/** Every ref and piece of state the editor shares, plus the coordinate helpers. */
export function useEditorCore(props: EditorProps) {
  const host = useRef<HTMLDivElement>(null),
    overlay = useRef<HTMLCanvasElement>(null),
    application = useRef<Application | null>(null),
    // The map is shown as a grid of GPU tiles, so a brush stroke uploads
    // only the tiles it touched instead of the whole map every frame.
    sprite = useRef<Container | null>(null),
    tiles = useRef<GpuTile[]>([]),
    mapCanvas = useRef(document.createElement("canvas")),
    latest = useRef(props),
    view = useRef<View>({ x: 0, y: 0, scale: 1 }),
    space = useRef(false),
    draft = useRef<MapData | null>(null),
    drag = useRef<{
      start: Point;
      last: Point;
      screen: Point;
      pan: boolean;
      objects: MapObject[];
      /** Selected rivers, roads and walls as they were when the drag began. */
      paths?: MapPath[];
      handle: string;
      stroke?: Stroke;
      box?: Point;
      flat?: number;
      trail?: Point[];
      sculpted?: boolean;
      /** The eraser removed a stamp, label or path during this drag. */
      erased?: boolean;
      /** Cells a terrain tool has changed during this drag. */
      sculptDirty?: CellRect;
      /** The fog tool's working copy of the map's fog, and whether it changed. */
      fog?: FogGrid;
      fogged?: boolean;
      /** The scatter brush's random numbers for this stroke. */
      rand?: () => number;
    } | null>(null),
    [ready, setReady] = useState(false),
    [renderError, setRenderError] = useState("");
  const lastPaint = useRef<Point | null>(null);
  // Points of the river being placed; it is only drawn once approved.
  const riverPoints = useRef<Point[]>([]);
  const hover = useRef<Point | undefined>(undefined);
  const preview = useRef(false);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastStatus = useRef({ zoom: 100, x: 0, y: 0, height: 0, biome: 0 });
  // Fingers currently on the map and the pinch that two of them start.
  const touches = useRef(new Map<number, Point>());
  const pinch = useRef<{
    distance: number;
    centre: Point;
    view: View;
  } | null>(null);
  const detail = useRef<HTMLCanvasElement>(null);
  const detailTimer = useRef(0);
  // Bumped on every view change so a half-painted detail job stops.
  const detailJob = useRef(0);
  const queued = useRef<Frame | null>(null);
  const frame = useRef(0);
  const statusFrame = useRef(0);
  const sculpt = useRef<{
    pos: Point;
    last: Point;
    time: number;
    pressure: number;
    frame: number;
    /**
     * A touch waits this long (or until the finger moves) before the first
     * dab, so the first finger of a pinch never changes the terrain.
     */
    holdUntil?: number;
  } | null>(null);
  latest.current = props;
  const size = useRef({ w: 1000, h: 700 });
  const screenPoint = (p: Point) => ({
    x: p.x * view.current.scale + view.current.x,
    y: p.y * view.current.scale + view.current.y,
  });
  const worldPoint = (p: Point) => ({
    x: (p.x - view.current.x) / view.current.scale,
    y: (p.y - view.current.y) / view.current.scale,
  });
  const getPoint = (e: { clientX: number; clientY: number }) => {
    const rect = host.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  return {
    props,
    host,
    overlay,
    application,
    sprite,
    tiles,
    mapCanvas,
    latest,
    view,
    space,
    draft,
    drag,
    ready,
    setReady,
    renderError,
    setRenderError,
    lastPaint,
    riverPoints,
    hover,
    preview,
    previewTimer,
    lastStatus,
    touches,
    pinch,
    detail,
    detailTimer,
    detailJob,
    queued,
    frame,
    statusFrame,
    sculpt,
    size,
    screenPoint,
    worldPoint,
    getPoint,
  };
}

export type EditorCore = ReturnType<typeof useEditorCore>;
