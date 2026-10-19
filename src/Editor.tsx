import {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import { Application, Sprite, Texture } from "pixi.js";
import { drawMap, loadImage } from "./render";
import { hitObject, navigationTarget } from "./hit-test";
import { biomeAt, keyRoom } from "./generator";
import { riverBetween, snapToRiver } from "./rivers";
import { clamp, random } from "./random";
import {
  SCULPT_TOOLS,
  raiseIsland,
  raiseRange,
  resample,
  sculptAmount,
  sculptDab,
  simplify,
  unionRects,
} from "./sculpt";
import { isScatterSprite, preloadSymbols } from "./symbols";
import { uid } from "./types";
import { editableTerrain, terrainView } from "./terrain";
import type { CellRect } from "./terrain-render";
import type {
  MapData,
  MapObject,
  Point,
  StampKind,
  Stroke,
  Tool,
} from "./types";
export interface BrushSettings {
  size: number;
  strength: number;
  opacity: number;
  hardness: number;
  color: string;
  biome: number;
  stamp: StampKind;
  /** A bundled sprite to place with the stamp tool; wins over `stamp`. */
  sprite?: { src: string; name: string };
  snap: boolean;
  pressure: boolean;
  layer: string;
  mask?: boolean;
}
export interface EditorHandle {
  fit: () => void;
  zoom: (factor: number) => void;
  exportCanvas: (player: boolean, scale: number) => HTMLCanvasElement;
}
interface Props {
  map: MapData;
  tool: Tool;
  brush: BrushSettings;
  selected: string[];
  setSelected: (ids: string[]) => void;
  onChange: (map: MapData, label: string) => void;
  onOpen: (object: MapObject) => void;
  onColor: (color: string) => void;
  contours: boolean;
  player: boolean;
  onStatus: (status: {
    zoom: number;
    x: number;
    y: number;
    height: number;
    biome: number;
  }) => void;
}
type View = { x: number; y: number; scale: number };
type Frame = { map: MapData; dirty?: CellRect; live?: string };

const PAINT_TOOLS: Tool[] = [
  "brush",
  "pencil",
  "eraser",
  "line",
  "rectangle",
  "ellipse",
  "fill",
];
// Tools whose result rewrites the height field and therefore needs private copies.
const TERRAIN_TOOLS: Tool[] = [
  ...SCULPT_TOOLS,
  "ridge",
  "island",
  "river",
  "room",
];
/**
 * Copies only what a tool will change. Cloning every stroke and height of a
 * large map for each click made editing slow; shared arrays stay untouched.
 */
function beginDraft(m: MapData, tool: Tool): MapData {
  const draft: MapData = {
    ...m,
    objects: m.objects.map((o) => ({ ...o })),
    paths: [...m.paths],
    strokes: [...m.strokes],
    rooms: m.rooms.map((r) => ({ ...r })),
    layers: m.layers.map((l) => ({
      ...l,
      mask: l.mask ? [...l.mask] : undefined,
    })),
  };
  if (TERRAIN_TOOLS.includes(tool)) {
    draft.heights = m.heights.slice();
    draft.biomes = m.biomes.slice();
    if (m.terrain)
      draft.terrain = {
        heights: m.terrain.heights.slice(),
        biomes: m.terrain.biomes.slice(),
      };
  }
  return draft;
}

export const Editor = forwardRef<EditorHandle, Props>(
  function Editor(props, ref) {
    const host = useRef<HTMLDivElement>(null),
      overlay = useRef<HTMLCanvasElement>(null),
      application = useRef<Application | null>(null),
      sprite = useRef<Sprite | null>(null),
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
        handle: string;
        stroke?: Stroke;
        box?: Point;
        flat?: number;
        trail?: Point[];
        sculpted?: boolean;
      } | null>(null),
      [ready, setReady] = useState(false),
      [renderError, setRenderError] = useState("");
    const lastPaint = useRef<Point | null>(null);
    // Source of the river being drawn; the next click places its mouth.
    const riverStart = useRef<Point | null>(null);
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
    const queued = useRef<Frame | null>(null);
    const frame = useRef(0);
    const statusFrame = useRef(0);
    const sculpt = useRef<{
      pos: Point;
      last: Point;
      time: number;
      pressure: number;
      frame: number;
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
      window.clearTimeout(detailTimer.current);
      detailTimer.current = window.setTimeout(renderDetail, 220);
    };
    /** Redraws the visible part of the map as vectors at the current zoom. */
    function renderDetail() {
      const canvas = detail.current;
      if (!canvas || drag.current || !sprite.current) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2),
        v = view.current;
      if (v.scale * dpr < 1.1) return;
      const m = latest.current.map,
        w = Math.round(size.current.w * dpr),
        h = Math.round(size.current.h * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const ctx = canvas.getContext("2d")!;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.setTransform(v.scale * dpr, 0, 0, v.scale * dpr, v.x * dpr, v.y * dpr);
      ctx.imageSmoothingQuality = "high";
      drawMap(ctx, m, {
        contours: latest.current.contours,
        player: latest.current.player,
        vector: true,
      });
      canvas.style.display = "block";
    }
    /** Draws the map now and uploads it to the GPU. */
    const render = (f: Frame) => {
      const canvas = mapCanvas.current;
      if (canvas.width !== f.map.width || canvas.height !== f.map.height) {
        canvas.width = f.map.width;
        canvas.height = f.map.height;
      }
      drawMap(canvas.getContext("2d")!, f.map, {
        contours: latest.current.contours,
        player: latest.current.player,
        dirty: f.dirty,
        liveStroke: f.live,
      });
      if (sprite.current) {
        if (sprite.current.texture === Texture.EMPTY)
          sprite.current.texture = Texture.from(canvas);
        else sprite.current.texture.source.update();
        position();
      }
    };
    /** Queues a redraw for the next animation frame, merging pending changes. */
    const refresh = (
      m: MapData = latest.current.map,
      dirty?: CellRect,
      live?: string,
    ) => {
      const pending = queued.current;
      queued.current = {
        map: m,
        dirty: m === pending?.map ? unionRects(pending?.dirty, dirty) : dirty,
        live: live ?? (m === pending?.map ? pending?.live : undefined),
      };
      if (frame.current) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        const next = queued.current;
        queued.current = null;
        if (next && sprite.current) render(next);
      });
    };
    const selectedBounds = () => {
      const p = latest.current,
        m = draft.current || p.map,
        objects = m.objects.filter((o) => p.selected.includes(o.id));
      if (!objects.length) return null;
      const x = Math.min(...objects.map((o) => o.x - o.width / 2)),
        y = Math.min(...objects.map((o) => o.y - o.height / 2)),
        right = Math.max(...objects.map((o) => o.x + o.width / 2)),
        bottom = Math.max(...objects.map((o) => o.y + o.height / 2));
      return { x, y, w: right - x, h: bottom - y, objects };
    };
    function drawOverlay(cursor?: Point) {
      const canvas = overlay.current;
      if (!canvas) return;
      const c = canvas.getContext("2d")!;
      c.clearRect(0, 0, canvas.width, canvas.height);
      const bounds = selectedBounds();
      if (bounds) {
        const a = screenPoint(bounds),
          w = bounds.w * view.current.scale,
          h = bounds.h * view.current.scale;
        c.strokeStyle = "#f3d391";
        c.lineWidth = 1;
        c.setLineDash([4, 3]);
        c.strokeRect(a.x, a.y, w, h);
        c.setLineDash([]);
        c.fillStyle = "#30281c";
        for (const [x, y] of [
          [0, 0],
          [0.5, 0],
          [1, 0],
          [0, 0.5],
          [1, 0.5],
          [0, 1],
          [0.5, 1],
          [1, 1],
        ]) {
          c.fillRect(a.x + w * x - 3, a.y + h * y - 3, 6, 6);
          c.strokeRect(a.x + w * x - 3, a.y + h * y - 3, 6, 6);
        }
        c.beginPath();
        c.moveTo(a.x + w / 2, a.y);
        c.lineTo(a.x + w / 2, a.y - 22);
        c.stroke();
        c.beginPath();
        c.arc(a.x + w / 2, a.y - 25, 4, 0, Math.PI * 2);
        c.fill();
        c.stroke();
      }
      if (drag.current?.box) {
        const a = screenPoint(drag.current.start),
          b = screenPoint(drag.current.box);
        c.fillStyle = "#d2af5b19";
        c.strokeStyle = "#d0b77a";
        c.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
        c.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
      }
      if (riverStart.current && latest.current.tool === "river") {
        const rivers = latest.current.map.paths.filter(
            (p) => p.kind === "river",
          ),
          from = snapToRiver(riverStart.current, rivers) ?? riverStart.current,
          a = screenPoint(from);
        c.strokeStyle = "#7fb7d6";
        c.fillStyle = "#7fb7d6";
        c.lineWidth = 2;
        if (cursor) {
          const hover = snapToRiver(worldPoint(cursor), rivers),
            b = hover ? screenPoint(hover) : cursor;
          c.setLineDash([6, 4]);
          c.beginPath();
          c.moveTo(a.x, a.y);
          c.lineTo(b.x, b.y);
          c.stroke();
          c.setLineDash([]);
          if (hover) {
            // The mouth is close enough to a river to join it.
            c.beginPath();
            c.arc(b.x, b.y, 6, 0, Math.PI * 2);
            c.stroke();
          }
        }
        c.beginPath();
        c.arc(a.x, a.y, 4, 0, Math.PI * 2);
        c.fill();
      }
      const trail = drag.current?.trail;
      if (trail && trail.length > 1) {
        c.beginPath();
        trail.forEach((p, i) => {
          const s = screenPoint(p);
          if (i) c.lineTo(s.x, s.y);
          else c.moveTo(s.x, s.y);
        });
        c.strokeStyle = "#e6c58a";
        c.lineWidth = 2;
        c.setLineDash([6, 4]);
        c.stroke();
        c.setLineDash([]);
      }
      const t = latest.current.tool;
      if (drag.current && ["island", "room"].includes(t) && drag.current.box) {
        const a = screenPoint(drag.current.start),
          b = screenPoint(drag.current.box);
        c.strokeStyle = "#e6c58a";
        c.setLineDash([5, 4]);
        if (t === "island") {
          c.beginPath();
          c.ellipse(
            (a.x + b.x) / 2,
            (a.y + b.y) / 2,
            Math.abs(b.x - a.x) / 2,
            Math.abs(b.y - a.y) / 2,
            0,
            0,
            Math.PI * 2,
          );
          c.stroke();
        } else c.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
        c.setLineDash([]);
      }
      if (
        cursor &&
        !["select", "hand", "text", "river", "island", "room"].includes(t)
      ) {
        const radius = (latest.current.brush.size * view.current.scale) / 2;
        c.beginPath();
        c.arc(cursor.x, cursor.y, radius, 0, Math.PI * 2);
        c.strokeStyle = "#fff9df";
        c.lineWidth = 1;
        c.stroke();
        c.beginPath();
        c.arc(cursor.x, cursor.y, radius + 1, 0, Math.PI * 2);
        c.strokeStyle = "#282c2277";
        c.stroke();
        if (SCULPT_TOOLS.includes(t)) {
          // The inner ring marks where the brush works at full strength.
          c.beginPath();
          c.arc(cursor.x, cursor.y, radius * 0.45, 0, Math.PI * 2);
          c.setLineDash([3, 3]);
          c.strokeStyle = "#fff9df99";
          c.stroke();
          c.setLineDash([]);
        }
      }
    }
    useImperativeHandle(ref, () => ({
      fit,
      zoom: (f) => zoomAt(f, { x: size.current.w / 2, y: size.current.h / 2 }),
      exportCanvas: (player, scale) => {
        const canvas = document.createElement("canvas");
        canvas.width = latest.current.map.width * scale;
        canvas.height = latest.current.map.height * scale;
        const ctx = canvas.getContext("2d")!;
        ctx.scale(scale, scale);
        drawMap(ctx, latest.current.map, {
          player,
          contours: latest.current.contours,
          vector: true,
        });
        return canvas;
      },
    }));
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
    useEffect(() => {
      let cancelled = false;
      const app = new Application();
      const init = async () => {
        try {
          await app.init({
            backgroundAlpha: 0,
            antialias: true,
            resolution: Math.min(devicePixelRatio, 2),
            autoDensity: true,
            preference: "webgl",
            autoStart: false,
          });
          if (cancelled) {
            app.destroy(true);
            return;
          }
          application.current = app;
          host.current!.prepend(app.canvas);
          const sp = new Sprite(Texture.EMPTY);
          sprite.current = sp;
          app.stage.addChild(sp);
          const observer = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            size.current = { w: width, h: height };
            app.renderer.resize(width, height);
            if (overlay.current) {
              overlay.current.width = width;
              overlay.current.height = height;
            }
            fit();
          });
          observer.observe(host.current!);
          (app as Application & { cleanup?: () => void }).cleanup = () =>
            observer.disconnect();
          // Symbols must be loaded before the first frame, or the map would flash
          // with placeholder shapes.
          await preloadSymbols();
          if (cancelled) return;
          render({ map: latest.current.map });
          setReady(true);
        } catch (e) {
          setRenderError(`The map renderer could not start. ${String(e)}`);
        }
      };
      void init();
      const down = (e: KeyboardEvent) => {
        if (e.key === "Escape" && riverStart.current) {
          riverStart.current = null;
          drawOverlay();
        }
        if (
          e.code === "Space" &&
          !(
            e.target instanceof HTMLInputElement ||
            e.target instanceof HTMLTextAreaElement ||
            e.target instanceof HTMLSelectElement
          )
        ) {
          space.current = true;
          e.preventDefault();
        }
        if (
          e.key === "0" &&
          !(
            e.target instanceof HTMLInputElement ||
            e.target instanceof HTMLTextAreaElement
          )
        )
          fit();
      };
      const up = (e: KeyboardEvent) => {
        if (e.code === "Space") space.current = false;
      };
      window.addEventListener("keydown", down);
      window.addEventListener("keyup", up);
      return () => {
        cancelled = true;
        window.removeEventListener("keydown", down);
        window.removeEventListener("keyup", up);
        cancelAnimationFrame(frame.current);
        clearTimeout(statusFrame.current);
        window.clearTimeout(detailTimer.current);
        if (sculpt.current) cancelAnimationFrame(sculpt.current.frame);
        frame.current = statusFrame.current = 0;
        queued.current = null;
        if (app.renderer) {
          (app as Application & { cleanup?: () => void }).cleanup?.();
          app.destroy(true, {
            children: true,
            texture: true,
            textureSource: true,
          });
        }
        application.current = null;
        sprite.current = null;
      };
    }, []);
    useEffect(() => {
      if (!ready) return;
      let active = true;
      const images = props.map.objects
        .filter((o) => o.image)
        .map((o) => loadImage(o.image!));
      refresh();
      if (images.length)
        void Promise.allSettled(images).then(() => {
          if (active) refresh();
        });
      return () => {
        active = false;
      };
    }, [props.map, props.contours, props.player, ready]);
    useEffect(() => {
      if (ready) fit();
    }, [props.map.id, ready]);
    useEffect(() => {
      if (props.tool !== "river") riverStart.current = null;
      drawOverlay();
    }, [props.selected, props.tool, props.brush]);
    useEffect(() => {
      riverStart.current = null;
    }, [props.map.id]);
    useEffect(() => {
      const el = host.current;
      if (!el) return;
      const wheel = (e: WheelEvent) => {
        e.preventDefault();
        zoomAt(Math.exp(-e.deltaY * 0.001), getPoint(e));
      };
      el.addEventListener("wheel", wheel, { passive: false });
      return () => el.removeEventListener("wheel", wheel);
    }, []);
    const editable = (m: MapData, id: string) => {
      const l = m.layers.find((l) => l.id === id);
      return !!l && !l.locked && l.visible;
    };
    /** Time-based brush: the longer the pointer stays down, the more terrain moves. */
    function sculptFrame(now: number) {
      const s = sculpt.current,
        m = draft.current;
      if (!s || !m) return;
      // A long frame must not make the terrain jump, so time per step is capped.
      const b = latest.current.brush,
        tool = latest.current.tool,
        distance = Math.hypot(s.pos.x - s.last.x, s.pos.y - s.last.y),
        // Sweeping the brush counts as time spent on that ground, so a quick
        // swipe of a finger still shapes the land and not only a slow press.
        dt =
          Math.min(0.1, Math.max(0.001, (now - s.time) / 1000)) +
          Math.min(0.1, distance / (b.size * 12)),
        steps = Math.max(1, Math.ceil(distance / Math.max(2, b.size * 0.18))),
        amount = sculptAmount(b.strength, dt, s.pressure, tool) / steps;
      let dirty: CellRect | undefined;
      for (let k = 1; k <= steps; k++)
        dirty = unionRects(
          dirty,
          sculptDab(
            m,
            tool,
            {
              x: s.last.x + ((s.pos.x - s.last.x) * k) / steps,
              y: s.last.y + ((s.pos.y - s.last.y) * k) / steps,
            },
            amount,
            drag.current?.flat ?? 0,
            b,
          ) ?? undefined,
        );
      s.last = s.pos;
      s.time = now;
      if (dirty) {
        if (drag.current) drag.current.sculpted = true;
        cancelAnimationFrame(frame.current);
        frame.current = 0;
        queued.current = null;
        render({ map: m, dirty });
      }
      s.frame = requestAnimationFrame(sculptFrame);
    }
    function endSculpt() {
      if (sculpt.current) cancelAnimationFrame(sculpt.current.frame);
      sculpt.current = null;
    }
    function placeStamp(p: Point) {
      const m = draft.current!,
        b = latest.current.brush;
      if (!editable(m, b.layer)) return;
      if (b.sprite) {
        const scatter = isScatterSprite(b.sprite.src);
        m.objects.push({
          id: uid(),
          kind: "image",
          image: b.sprite.src,
          x: p.x,
          y: p.y,
          name: b.sprite.name,
          width: scatter ? b.size * 0.7 : b.size,
          height: scatter ? b.size * 0.7 : b.size,
          rotation: 0,
          layer: b.layer,
          color: b.color,
        });
        return;
      }
      const tree = ["tree", "pine"].includes(b.stamp);
      m.objects.push({
        id: uid(),
        kind: b.stamp,
        x: p.x,
        y: p.y,
        name:
          b.stamp === "tavern"
            ? ["The Copper Stag", "The Wandering Fox", "The Merry Badger"][
                Math.floor(Math.random() * 3)
              ]
            : b.stamp.charAt(0).toUpperCase() + b.stamp.slice(1),
        width: tree ? b.size * 0.45 : b.size,
        height: tree ? b.size * 0.6 : b.size,
        rotation: 0,
        layer: b.stamp === "trap" || b.stamp === "secret" ? "GM-only" : b.layer,
        color: b.color,
      });
    }
    /** Two fingers zoom and pan the map, like any map app. */
    function pinchStart() {
      const [a, b] = [...touches.current.values()];
      pinch.current = {
        distance: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        centre: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        view: { ...view.current },
      };
    }
    function pinchMove() {
      const g = pinch.current,
        [a, b] = [...touches.current.values()];
      if (!g || !a || !b) return;
      const centre = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        scale = clamp(
          (g.view.scale * (Math.hypot(a.x - b.x, a.y - b.y) || 1)) / g.distance,
          0.12,
          5,
        ),
        // Keep the map point that was under the starting midpoint under the fingers.
        anchor = {
          x: (g.centre.x - g.view.x) / g.view.scale,
          y: (g.centre.y - g.view.y) / g.view.scale,
        };
      view.current = {
        scale,
        x: centre.x - anchor.x * scale,
        y: centre.y - anchor.y * scale,
      };
      position();
    }
    function pointerDown(e: React.PointerEvent) {
      if (e.pointerType === "touch") {
        e.currentTarget.setPointerCapture(e.pointerId);
        touches.current.set(e.pointerId, getPoint(e));
        if (touches.current.size >= 2) {
          // A second finger turns the touch into a gesture: drop what the
          // first finger had started instead of committing a stray mark.
          endSculpt();
          drag.current = null;
          draft.current = null;
          refresh();
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
              if (
                Math.hypot(screen.x - a.x - w * x, screen.y - a.y - h * y) < 9
              )
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
            ids = m.objects
              .filter((o) => o.group === hit.group)
              .map((o) => o.id);
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
        // the loop then keeps going every frame.
        sculpt.current.time = performance.now() - 120;
        sculptFrame(performance.now());
        drawOverlay(screen);
        return;
      } else if (PAINT_TOOLS.includes(p.tool)) {
        if (!editable(m, p.brush.layer)) return;
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
      } else if (
        p.tool === "river" &&
        editable(m, "Water")
      ) {
        // Two clicks: the first marks the source, the second the mouth. The
        // river is the straight line between them, joined to a neighbouring
        // river only when an end lies within a small gap of it.
        const first = riverStart.current;
        if (!first) riverStart.current = world;
        else {
          riverStart.current = null;
          const river = riverBetween(
            first,
            world,
            m.paths.filter((p) => p.kind === "river"),
            uid(),
          );
          if (river) m.paths.push(river);
        }
        refresh(m);
      } else if (["road", "wall", "ridge"].includes(p.tool)) {
        drag.current.trail = [world];
      }
      drawOverlay(screen);
    }
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
        if (["line", "rectangle", "ellipse"].includes(p.tool))
          d.stroke.points = [d.start, world];
        else {
          // Every pointer sample since the last frame, so fast strokes stay smooth.
          const samples = e.nativeEvent.getCoalescedEvents?.() ?? [];
          if (samples.length > 1)
            for (const s of samples)
              d.stroke.points.push(worldPoint(getPoint(s)));
          else d.stroke.points.push(world);
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
      refresh(m, undefined, d.stroke && !p.brush.mask ? d.stroke.id : undefined);
      drawOverlay(screen);
    }
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
          p.setSelected(
            e.shiftKey ? [...new Set([...p.selected, ...ids])] : ids,
          );
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
          changed = !!d.stroke;
        } else if (SCULPT_TOOLS.includes(p.tool)) {
          changed = d.sculpted === true;
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
    function doubleClick(e: React.MouseEvent) {
      const point = worldPoint(getPoint(e));
      const { map, player } = latest.current;
      const o = navigationTarget(
        map.objects.filter(
          (o) =>
            map.layers.find((l) => l.id === o.layer)?.visible !== false &&
            !(player && o.layer === "GM-only"),
        ),
        point,
      );
      if (o) latest.current.onOpen(o);
    }
    return (
      <div
        className={`map-stage tool-${props.tool}`}
        ref={host}
        onContextMenu={(e) => e.preventDefault()}
      >
        <canvas ref={detail} className="detail-canvas" aria-hidden="true" />
        <canvas
          ref={overlay}
          className="interaction-canvas"
          aria-label="Interactive map canvas"
          tabIndex={0}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={pointerUp}
          onPointerLeave={() => !drag.current && drawOverlay()}
          onDoubleClick={doubleClick}
        />
        {renderError && <div className="render-error">{renderError}</div>}
      </div>
    );
  },
);
