import { useMemo } from "react";
import { Editor } from "../editor/Editor";
import { styleOf } from "../map-styles";
import { poolAssets, scatterPool } from "../scatter-brush";
import { imagesWithSprite, spriteAssets } from "../stamp-brush";
import { cursorStatus } from "../status";
import { IconButton } from "../ui/IconButton";
import { ZoomReadout } from "../ui/Readouts";
import {
  Crosshair,
  Eye,
  EyeOff,
  Grid2X2,
  Layers,
  LoaderCircle,
  Maximize,
  Minus,
  Plus,
  SlidersHorizontal,
  Waves,
  X,
} from "lucide-react";
import type { ReadyApp } from "../app/useAppModel";
import { NoteLinkButton } from "./NoteLinkField";

export function CanvasWorkspace({ app }: { app: ReadyApp }) {
  const {
    assetPack,
    brush,
    busy,
    color,
    contours,
    editor,
    hidePanels,
    lang,
    map,
    mutateMap,
    openObject,
    player,
    project,
    selected,
    setBrush,
    setContours,
    setHidePanels,
    setPlayer,
    setProject,
    setRiverCount,
    setSelected,
    setSheet,
    sheet,
    t,
    textureVersion,
    tool,
    updateMap,
  } = app;
  // A stamp being drawn shows before its picture joins the world's table.
  const images = useMemo(
    () => imagesWithSprite(project.images, brush.sprite),
    [project.images, brush.sprite],
  );
  const pool = useMemo(
    () =>
      scatterPool(
        brush.scatter,
        brush.sprite,
        assetPack,
        project.scatterMixes,
        {
          images: project.images,
          credits: project.credits,
        },
      ),
    [
      brush.scatter,
      brush.sprite,
      assetPack,
      project.scatterMixes,
      project.images,
      project.credits,
    ],
  );
  return (
    <section className="canvas-workspace wood" aria-label="Map workspace">
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">
            <span className="tiny-diamond" />
            {t(
              map.kind === "world"
                ? "World map"
                : map.kind === "city"
                  ? "City map"
                  : "Dungeon map",
            )}
            <span className="heading-index">
              / {String(project.maps.indexOf(map) + 1).padStart(2, "0")}
            </span>
            {map.noteUrl && <NoteLinkButton url={map.noteUrl} t={t} />}
          </span>
          <h1>
            <input
              aria-label={t("Map name")}
              value={map.name}
              onChange={(e) => {
                const value = e.target.value;
                setProject({
                  ...project,
                  maps: project.maps.map((m) =>
                    m.id === map.id ? { ...m, name: value } : m,
                  ),
                });
              }}
            />
          </h1>
        </div>
        <div className="workspace-toggles">
          <IconButton
            icon={Grid2X2}
            title={t("Grid")}
            hint={t("Show or hide the square grid over the map.")}
            active={map.settings.grid !== "none"}
            onClick={() => {
              mutateMap(
                (m) =>
                  (m.settings.grid =
                    m.settings.grid === "none" ? "square" : "none"),
                "Toggle grid",
              );
            }}
          />
          <IconButton
            icon={Waves}
            title={t("Contours")}
            hint={t("Draw height contour lines over the land.")}
            active={contours}
            onClick={() => setContours((v) => !v)}
          />
          <IconButton
            icon={Crosshair}
            title={t("Snap")}
            hint={t("Snap dragged objects to a grid.")}
            active={brush.snap}
            onClick={() => setBrush((b) => ({ ...b, snap: !b.snap }))}
          />
          <IconButton
            icon={player ? Eye : EyeOff}
            title={t(player ? "Player view" : "GM view")}
            hint={t(
              "Switch between what you see as GM and what players see. Player view hides GM-only secrets.",
            )}
            active={player}
            onClick={() => setPlayer((v) => !v)}
          />
        </div>
      </div>
      <Editor
        ref={editor}
        map={map}
        tool={tool}
        brush={brush}
        scatterPool={pool}
        selected={selected}
        setSelected={setSelected}
        onChange={(m, label) =>
          updateMap(
            m,
            label,
            pool.length ? poolAssets(pool) : spriteAssets(brush.sprite),
          )
        }
        onOpen={openObject}
        onColor={color}
        onRiverPoints={setRiverCount}
        contours={contours}
        player={player}
        textureVersion={textureVersion}
        images={images}
        onStatus={cursorStatus.set}
      />
      <div className="map-corner-note">
        <span className="seed-dot" />
        SEED <b>{map.settings.seed}</b>
        <span>·</span>
        {t(styleOf(map.settings).label)}
      </div>
      <div className="view-controls wood">
        <IconButton
          icon={Minus}
          title={t("Zoom out")}
          onClick={() => editor.current?.zoom(0.8)}
        />
        <button
          className="zoom-label"
          title={t("Fit map")}
          onClick={() => editor.current?.fit()}
        >
          <ZoomReadout />
          <span>%</span>
        </button>
        <IconButton
          icon={Plus}
          title={t("Zoom in")}
          onClick={() => editor.current?.zoom(1.25)}
        />
        <span className="control-divider" />
        <IconButton
          icon={Maximize}
          title={t("Fit map")}
          keys="0"
          onClick={() => editor.current?.fit()}
        />
      </div>
      <button
        className="sheet-toggle button brass"
        aria-label={sheet ? t("Close") : t("Tool settings")}
        onClick={() => setSheet((v) => !v)}
      >
        {sheet ? <X size={18} /> : <SlidersHorizontal size={18} />}
      </button>
      {busy && (
        <div className="busy-overlay">
          <div className="busy-card wood">
            <LoaderCircle className="spin" size={27} />
            <h3>{lang === "ru" ? "Создаём карту…" : "Generating…"}</h3>
          </div>
        </div>
      )}
      {hidePanels && (
        <button
          className="show-panels button wood"
          onClick={() => setHidePanels(false)}
        >
          <Layers size={15} />
          Tab
        </button>
      )}
    </section>
  );
}
