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
import { biomeAt, keyRoom, traceRiver } from "./generator";
import { clamp, random } from "./random";
import { uid } from "./types";
import { editableTerrain, terrainView } from "./terrain";
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
      } | null>(null),
      [ready, setReady] = useState(false),
      [renderError, setRenderError] = useState("");
    const lastPaint = useRef<Point | null>(null);
    const lastStatus = useRef({ zoom: 100, x: 0, y: 0, height: 0, biome: 0 });
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
      latest.current.onStatus({
        ...lastStatus.current,
        zoom: view.current.scale * 100,
      });
    };
    const refresh = (m: MapData = latest.current.map) => {
      const canvas = mapCanvas.current;
      canvas.width = m.width;
      canvas.height = m.height;
      drawMap(canvas.getContext("2d")!, m, {
        contours: latest.current.contours,
        player: latest.current.player,
      });
      if (sprite.current) {
        if (sprite.current.texture === Texture.EMPTY)
          sprite.current.texture = Texture.from(canvas);
        else sprite.current.texture.source.update();
        position();
      }
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
      if (cursor && !["select", "hand", "text"].includes(latest.current.tool)) {
        c.beginPath();
        c.arc(
          cursor.x,
          cursor.y,
          (latest.current.brush.size * view.current.scale) / 2,
          0,
          Math.PI * 2,
        );
        c.strokeStyle = "#fff9df";
        c.lineWidth = 1;
        c.stroke();
        c.beginPath();
        c.arc(
          cursor.x,
          cursor.y,
          (latest.current.brush.size * view.current.scale) / 2 + 1,
          0,
          Math.PI * 2,
        );
        c.strokeStyle = "#282c2277";
        c.stroke();
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
          refresh();
          setReady(true);
        } catch (e) {
          setRenderError(`The map renderer could not start. ${String(e)}`);
        }
      };
      void init();
      const down = (e: KeyboardEvent) => {
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
      drawOverlay();
    }, [props.selected, props.tool, props.brush]);
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
    function sculpt(p: Point, pressure = 1) {
      const m = draft.current!,
        b = latest.current.brush,
        t = latest.current.tool;
      if (!editable(m, "Terrain")) return;
      const terrain = editableTerrain(m);
      const cx = (p.x / m.width) * m.cols,
        cy = (p.y / m.height) * m.rows,
        r = ((b.size / m.width) * m.cols) / 2;
      const old = t === "smooth" ? [...terrain.heights] : terrain.heights;
      for (
        let y = Math.max(1, Math.floor(cy - r));
        y < Math.min(m.rows - 1, cy + r);
        y++
      )
        for (
          let x = Math.max(1, Math.floor(cx - r));
          x < Math.min(m.cols - 1, cx + r);
          x++
        ) {
          const distance = Math.hypot(x - cx, y - cy) / r;
          if (distance > 1) continue;
          const i = y * m.cols + x,
            strength = (((1 - distance) * b.strength) / 100) * 0.04 * pressure;
          if (t === "raise")
            terrain.heights[i] = clamp(terrain.heights[i] + strength);
          if (t === "dig")
            terrain.heights[i] = clamp(terrain.heights[i] - strength);
          if (t === "roughen")
            terrain.heights[i] = clamp(
              terrain.heights[i] + (Math.random() - 0.5) * strength * 2,
            );
          if (t === "flatten")
            terrain.heights[i] +=
              (drag.current!.flat! - terrain.heights[i]) * strength * 8;
          if (t === "smooth") {
            const avg =
              (old[i] +
                old[i - 1] +
                old[i + 1] +
                old[i - m.cols] +
                old[i + m.cols]) /
              5;
            terrain.heights[i] +=
              (avg - terrain.heights[i]) * Math.min(1, strength * 20);
          }
          if (t === "biome") terrain.biomes[i] = b.biome;
        }
      // Texture identity changes without copying the entire map during a stroke.
      terrain.heights = terrain.heights.slice();
    }
    function placeStamp(p: Point) {
      const m = draft.current!,
        b = latest.current.brush;
      if (!editable(m, b.layer)) return;
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
    function pointerDown(e: React.PointerEvent) {
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
      draft.current = structuredClone(p.map);
      const m = draft.current;
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
        draft.current = null;
        drag.current = null;
        return;
      }
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
      if (
        ["raise", "dig", "smooth", "flatten", "roughen", "biome"].includes(
          p.tool,
        )
      ) {
        if (!editable(m, "Terrain")) return;
        const terrain = editableTerrain(m);
        drag.current.flat =
          terrain.heights[
            Math.floor((world.y / m.height) * m.rows) * m.cols +
              Math.floor((world.x / m.width) * m.cols)
          ];
        sculpt(world);
      } else if (
        [
          "brush",
          "pencil",
          "eraser",
          "line",
          "rectangle",
          "ellipse",
          "fill",
        ].includes(p.tool)
      ) {
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
      } else if (p.tool === "stamp") placeStamp(world);
      else if (p.tool === "text") {
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
        }
      } else if (
        p.tool === "river" && editable(m, "Water") && editable(m, "Terrain")
      ) {
        editableTerrain(m);
        const start =
          clamp(Math.floor((world.y / m.height) * m.rows), 0, m.rows - 1) *
            m.cols +
          clamp(Math.floor((world.x / m.width) * m.cols), 0, m.cols - 1);
        const cells = traceRiver(terrainView(m), start);
        m.paths.push({
          id: uid(),
          kind: "river",
          points: cells.map((i) => ({
            x: (((i % m.cols) + 0.5) * m.width) / m.cols,
            y: ((Math.floor(i / m.cols) + 0.5) * m.height) / m.rows,
          })),
          width: 3,
          layer: "Water",
        });
      }
      refresh(m);
      drawOverlay(screen);
    }
    function pointerMove(e: React.PointerEvent) {
      const p = latest.current,
        screen = getPoint(e),
        world = worldPoint(screen),
        m = draft.current || p.map;
      const gx = clamp(Math.floor((world.x / m.width) * m.cols), 0, m.cols - 1),
        gy = clamp(Math.floor((world.y / m.height) * m.rows), 0, m.rows - 1),
        landscape = terrainView(m),
        h = landscape.heights[gy * m.cols + gx] || 0;
      const cursorStatus = {
        zoom: view.current.scale * 100,
        x: Math.round(world.x),
        y: Math.round(world.y),
        height: Math.round((h - m.settings.seaLevel) * 8000),
        biome: biomeAt(landscape, gx, gy),
      };
      lastStatus.current = cursorStatus;
      p.onStatus(cursorStatus);
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
      } else if (
        ["raise", "dig", "smooth", "flatten", "roughen", "biome"].includes(
          p.tool,
        )
      )
        sculpt(
          world,
          e.pointerType === "pen" && p.brush.pressure ? e.pressure * 2 : 1,
        );
      else if (d.stroke) {
        if (["line", "rectangle", "ellipse"].includes(p.tool))
          d.stroke.points = [d.start, world];
        else d.stroke.points.push(world);
      } else if (
        p.tool === "stamp" &&
        ["tree", "pine"].includes(p.brush.stamp) &&
        Math.hypot(world.x - d.last.x, world.y - d.last.y) > p.brush.size * 0.45
      ) {
        placeStamp(world);
        d.last = world;
      } else if (["road", "wall", "ridge", "island", "room"].includes(p.tool)) {
        drawOverlay(screen);
        const ctx = overlay.current!.getContext("2d")!,
          a = screenPoint(d.start);
        ctx.strokeStyle = "#e6c58a";
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(a.x, a.y, screen.x - a.x, screen.y - a.y);
        return;
      }
      refresh(m);
      drawOverlay(screen);
    }
    function pointerUp(e: React.PointerEvent) {
      const d = drag.current;
      if (!d) return;
      const p = latest.current,
        m = draft.current,
        world = worldPoint(getPoint(e));
      if (m && !d.pan) {
        if (d.stroke) lastPaint.current = world;
        if (d.box) {
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
        } else if (
          (p.tool === "road" || p.tool === "wall") &&
          editable(m, "Objects")
        ) {
          m.paths.push({
            id: uid(),
            kind: p.tool,
            points: [d.start, world],
            width: p.tool === "wall" ? 7 : 9,
            layer: "Objects",
          });
        } else if (p.tool === "ridge" && editable(m, "Terrain")) {
          const terrain = editableTerrain(m);
          const steps = Math.ceil(
            Math.hypot(world.x - d.start.x, world.y - d.start.y) / 5,
          );
          for (let n = 0; n <= steps; n++) {
            const at = {
                x: d.start.x + ((world.x - d.start.x) * n) / (steps || 1),
                y: d.start.y + ((world.y - d.start.y) * n) / (steps || 1),
              },
              cx = (at.x / m.width) * m.cols,
              cy = (at.y / m.height) * m.rows;
            for (
              let y = Math.max(1, Math.floor(cy - 5));
              y < Math.min(m.rows - 1, cy + 5);
              y++
            )
              for (
                let x = Math.max(1, Math.floor(cx - 5));
                x < Math.min(m.cols - 1, cx + 5);
                x++
              ) {
                const dist = Math.hypot(x - cx, y - cy) / 5;
                if (dist < 1)
                  terrain.heights[y * m.cols + x] = Math.max(
                    terrain.heights[y * m.cols + x],
                    m.settings.seaLevel + 0.35 * (1 - dist),
                  );
              }
          }
          terrain.heights = terrain.heights.slice();
        } else if (p.tool === "island" && editable(m, "Terrain")) {
          const terrain = editableTerrain(m);
          const cx = ((world.x + d.start.x) / 2 / m.width) * m.cols,
            cy = ((world.y + d.start.y) / 2 / m.height) * m.rows,
            rx = Math.max(
              1,
              (Math.abs(world.x - d.start.x) / 2 / m.width) * m.cols,
            ),
            ry = Math.max(
              1,
              (Math.abs(world.y - d.start.y) / 2 / m.height) * m.rows,
            );
          for (
            let y = Math.max(0, Math.floor(cy - ry));
            y < Math.min(m.rows, cy + ry);
            y++
          )
            for (
              let x = Math.max(0, Math.floor(cx - rx));
              x < Math.min(m.cols, cx + rx);
              x++
            ) {
              const dist = Math.hypot((x - cx) / rx, (y - cy) / ry);
              if (dist < 1)
                terrain.heights[y * m.cols + x] = Math.max(
                  terrain.heights[y * m.cols + x],
                  m.settings.seaLevel + 0.28 * (1 - dist),
                );
            }
          terrain.heights = terrain.heights.slice();
        } else if (p.tool === "room" && editable(m, "Terrain")) {
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
          m.heights = m.heights.slice();
        }
        if (
          !d.box &&
          (p.tool !== "select" ||
            Math.hypot(world.x - d.start.x, world.y - d.start.y) > 0.1)
        ) {
          p.onChange(
            m,
            p.tool === "select"
              ? "Transform objects"
              : p.tool === "text"
                ? "Add label"
                : `${p.tool.charAt(0).toUpperCase() + p.tool.slice(1)} stroke`,
          );
        }
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
        <canvas
          ref={overlay}
          className="interaction-canvas"
          aria-label="Interactive map canvas"
          tabIndex={0}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={pointerUp}
          onDoubleClick={doubleClick}
        />
        {renderError && <div className="render-error">{renderError}</div>}
      </div>
    );
  },
);
