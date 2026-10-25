import { useEffect } from "react";
import { imageSources, notLoaded } from "../images";
import { imageCache, loadImage } from "../render";
import { preloadSymbols } from "../symbols";
import { loadMapFonts } from "../map-fonts";
import { Application, Container } from "pixi.js";
import type { EditorCore } from "./useEditorCore";
import type { EditorOverlay } from "./overlay";
import type { EditorRendering } from "./rendering";

export function useEditorLifecycle(
  deps: EditorCore & EditorOverlay & EditorRendering,
) {
  const {
    props,
    host,
    overlay,
    application,
    sprite,
    tiles,
    latest,
    space,
    ready,
    setReady,
    setRenderError,
    riverPoints,
    preview,
    previewTimer,
    detailTimer,
    queued,
    frame,
    statusFrame,
    sculpt,
    size,
    getPoint,
    setRiverPoints,
    drawOverlay,
    fit,
    render,
    refresh,
    zoomAt,
  } = deps;
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
        const sp = new Container();
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
        // Symbols and lettering must be loaded before the first frame, or the
        // map would flash with placeholder shapes and fonts.
        await Promise.all([preloadSymbols(), loadMapFonts()]);
        if (cancelled) return;
        render({ map: latest.current.map });
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
      tiles.current = [];
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    let active = true;
    // Each distinct picture once, however many stamps show it. Only pictures
    // still loading earn a second draw: redrawing a map of tens of thousands
    // of stamps twice per edit doubled every paste, undo and move.
    const images = notLoaded(
      imageSources(props.map.objects, props.images),
      imageCache,
    ).map(loadImage);
    refresh();
    if (images.length)
      void Promise.allSettled(images).then(() => {
        if (active) refresh();
      });
    return () => {
      active = false;
    };
  }, [
    props.map,
    props.images,
    props.contours,
    props.player,
    props.textureVersion,
    ready,
  ]);
  useEffect(() => {
    if (ready) fit();
  }, [props.map.id, ready]);
  useEffect(() => {
    if (props.tool !== "river" && riverPoints.current.length)
      setRiverPoints([]);
    else drawOverlay();
  }, [props.selected, props.tool, props.brush]);
  useEffect(() => {
    // Changing the brush size shows its ring even if nothing points at the map.
    preview.current = true;
    drawOverlay();
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => {
      preview.current = false;
      drawOverlay();
    }, 1200);
    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
    };
  }, [props.brush.size, props.tool]);
  useEffect(() => {
    if (riverPoints.current.length) setRiverPoints([]);
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
}
