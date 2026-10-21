import { isMovable, moveLayer, placeLayer } from "../../layers";
import { ActiveLayerSettings } from "./ActiveLayerSettings";
import { TextureLayersSection } from "./TextureLayersSection";
import { uid } from "../../types";
import { IconButton } from "../../ui/IconButton";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Layers,
  LockKeyhole,
  LockKeyholeOpen,
  Paintbrush,
  Plus,
  RotateCcw,
} from "lucide-react";
import type { ReadyApp } from "../../app/useAppModel";

export function LayersPanel({ app }: { app: ReadyApp }) {
  const {
    activeLayer,
    brush,
    dragLayer,
    map,
    mutateMap,
    player,
    setActiveLayer,
    setBrush,
    setDragLayer,
    setPlayer,
    setTool,
    t,
    toggleLayer,
  } = app;
  return (
    <>
      <div className="panel-heading">
        <span className="section-kicker">{t("Layers")}</span>
      </div>
      <div className="layers-list">
        {[...map.layers].reverse().map((l) => (
          <div
            className={`layer-row ${activeLayer === l.id ? "selected" : ""} ${dragLayer && dragLayer !== l.id && isMovable(l) ? "drop-target" : ""}`}
            key={l.id}
            draggable={isMovable(l)}
            onDragStart={(e) => {
              setDragLayer(l.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragEnd={() => setDragLayer(null)}
            onDragOver={(e) => {
              if (dragLayer && isMovable(l)) e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              const id = dragLayer;
              setDragLayer(null);
              if (id && id !== l.id)
                mutateMap((m) => {
                  placeLayer(m.layers, id, l.id);
                }, "Reorder layers");
            }}
          >
            <IconButton
              icon={l.visible ? Eye : EyeOff}
              title={t(l.visible ? "Hide layer" : "Show layer")}
              active={!l.visible}
              onClick={() => toggleLayer(l.id, "visible")}
            />
            <button
              className="layer-name"
              onClick={() => {
                setActiveLayer(l.id);
                setBrush((b) => ({ ...b, layer: l.id }));
              }}
            >
              <span className={`layer-thumbnail layer-${l.id}`}>
                <Layers size={15} />
              </span>
              <span>{t(l.name)}</span>
            </button>
            {isMovable(l) && (
              <span className="layer-order">
                <IconButton
                  icon={ChevronUp}
                  title={t("Move layer up")}
                  onClick={() =>
                    mutateMap((m) => {
                      moveLayer(m.layers, l.id, 1);
                    }, "Reorder layers")
                  }
                />
                <IconButton
                  icon={ChevronDown}
                  title={t("Move layer down")}
                  onClick={() =>
                    mutateMap((m) => {
                      moveLayer(m.layers, l.id, -1);
                    }, "Reorder layers")
                  }
                />
              </span>
            )}
            <IconButton
              icon={l.locked ? LockKeyhole : LockKeyholeOpen}
              title={t(l.locked ? "Unlock layer" : "Lock layer")}
              active={l.locked}
              onClick={() => toggleLayer(l.id, "locked")}
            />
          </div>
        ))}
      </div>
      <ActiveLayerSettings app={app} />
      <div className="mask-actions">
        <button
          className={`button subtle ${brush.mask && brush.layer === activeLayer ? "mask-active" : ""}`}
          onClick={() => {
            setTool("brush");
            setBrush((b) => ({
              ...b,
              layer: activeLayer,
              mask: !b.mask || b.layer !== activeLayer,
            }));
          }}
        >
          <Paintbrush size={13} />
          {t("Paint layer mask")}
        </button>
        <button
          className="button subtle"
          title={t("Clear mask")}
          onClick={() =>
            mutateMap((m) => {
              delete m.layers.find((l) => l.id === activeLayer)!.mask;
            }, "Clear layer mask")
          }
        >
          <RotateCcw size={13} />
        </button>
      </div>
      <button
        className="button subtle full"
        onClick={() => {
          const id = uid();
          mutateMap(
            (m) =>
              m.layers.push({
                id,
                name: `Layer ${m.layers.length - 6}`,
                visible: true,
                locked: false,
                opacity: 1,
                blend: "source-over",
              }),
            "Add layer",
          );
          setActiveLayer(id);
          setBrush((b) => ({ ...b, layer: id }));
        }}
      >
        <Plus size={15} />
        {t("Add layer")}
      </button>
      <label className="checkbox player-toggle">
        <input
          type="checkbox"
          checked={player}
          onChange={(e) => setPlayer(e.target.checked)}
        />
        {t("Player view")}
      </label>
      <TextureLayersSection app={app} />
    </>
  );
}
