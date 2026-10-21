import { moveLayer, placeLayer } from "../../layers";
import { TextureSettings } from "./TextureSettings";
import { texturePreview } from "../../terrain-render";
import { IconButton } from "../../ui/IconButton";
import { ChevronDown, ChevronUp, Eye, EyeOff, Plus } from "lucide-react";
import type { ReadyApp } from "../../app/useAppModel";

export function TextureLayersSection({ app }: { app: ReadyApp }) {
  const {
    activeTexture,
    addTexture,
    changeTextures,
    dragTexture,
    map,
    setActiveTexture,
    setDragTexture,
    t,
    textures,
  } = app;
  return (
    <>
      <div className="panel-heading texture-heading">
        <span className="section-kicker">{t("Texture layers")}</span>
      </div>
      <div className="layers-list">
        {[...textures].reverse().map((l) => (
          <div
            className={`layer-row ${activeTexture === l.id ? "selected" : ""} ${dragTexture && dragTexture !== l.id ? "drop-target" : ""}`}
            key={l.id}
            draggable
            onDragStart={(e) => {
              setDragTexture(l.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragEnd={() => setDragTexture(null)}
            onDragOver={(e) => {
              if (dragTexture) e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              const id = dragTexture;
              setDragTexture(null);
              if (id && id !== l.id)
                changeTextures(
                  (list) => placeLayer(list, id, l.id, []),
                  "Reorder texture layers",
                );
            }}
          >
            <IconButton
              icon={l.visible ? Eye : EyeOff}
              title={t(l.visible ? "Hide texture" : "Show texture")}
              active={!l.visible}
              onClick={() =>
                changeTextures((list) => {
                  const n = list.find((n) => n.id === l.id)!;
                  n.visible = !n.visible;
                }, "Texture visibility")
              }
            />
            <button
              className="layer-name"
              onClick={() => setActiveTexture(l.id)}
            >
              <img
                className="layer-thumbnail texture-thumbnail"
                alt=""
                src={texturePreview(l, map.settings.style)}
              />
              <span>{t(l.name)}</span>
            </button>
            <span className="layer-order">
              <IconButton
                icon={ChevronUp}
                title={t("Move layer up")}
                onClick={() =>
                  changeTextures(
                    (list) => moveLayer(list, l.id, 1, []),
                    "Reorder texture layers",
                  )
                }
              />
              <IconButton
                icon={ChevronDown}
                title={t("Move layer down")}
                onClick={() =>
                  changeTextures(
                    (list) => moveLayer(list, l.id, -1, []),
                    "Reorder texture layers",
                  )
                }
              />
            </span>
          </div>
        ))}
      </div>
      <TextureSettings app={app} />
      <button className="button subtle full" onClick={addTexture}>
        <Plus size={15} />
        {t("Add texture layer")}
      </button>
    </>
  );
}
