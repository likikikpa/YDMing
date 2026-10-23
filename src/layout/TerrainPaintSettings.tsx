import { texturePreview } from "../terrain-render";
import { unusedPresets } from "../texture-presets";
import { Slider } from "../ui/Field";
import { ImagePlus, Plus } from "lucide-react";
import type { ReadyApp } from "../app/useAppModel";

export function TerrainPaintSettings({ app }: { app: ReadyApp }) {
  const {
    addTexture,
    addTexturePreset,
    brush,
    map,
    setActiveTexture,
    setBrush,
    setPanel,
    t,
    textureInput,
    textures,
    tool,
  } = app;
  if (!(tool === "terrain")) return null;
  return (
    <>
      <Slider
        label={t("Edge hardness")}
        value={brush.hardness}
        onChange={(v) => setBrush((b) => ({ ...b, hardness: v }))}
        min={0}
      />
      <div className="material-swatches" role="radiogroup">
        {[...textures].reverse().map((l) => (
          <button
            key={l.id}
            role="radio"
            aria-checked={brush.material === l.id}
            className={brush.material === l.id ? "active" : ""}
            title={t(l.name)}
            onClick={() => setBrush((b) => ({ ...b, material: l.id }))}
          >
            <img alt="" src={texturePreview(l, map.settings.style)} />
            <span>{t(l.name)}</span>
          </button>
        ))}
        <button
          role="radio"
          aria-checked={brush.material === ""}
          className={`auto ${brush.material === "" ? "active" : ""}`}
          title={t("Back to the biome's own ground")}
          onClick={() => setBrush((b) => ({ ...b, material: "" }))}
        >
          <span className="auto-swatch">A</span>
          <span>{t("Auto")}</span>
        </button>
        <button title={t("Add texture layer")} onClick={addTexture}>
          <span className="auto-swatch">
            <Plus size={15} />
          </span>
          <span>{t("New")}</span>
        </button>
      </div>
      <div className="material-swatches photos">
        {unusedPresets(textures).map((p) => (
          <button
            key={p.id}
            role="radio"
            aria-checked={false}
            title={t(p.name)}
            onClick={() => void addTexturePreset(p.id)}
          >
            <img alt="" src={p.src} />
            <span>{t(p.name)}</span>
          </button>
        ))}
      </div>
      {(() => {
        const l = textures.find((l) => l.id === brush.material);
        if (!l) return null;
        return (
          <div className="texture-actions">
            <button
              className="button subtle"
              onClick={() => {
                setActiveTexture(l.id);
                textureInput.current?.click();
              }}
            >
              <ImagePlus size={13} />
              {t(l.image ? "Replace image" : "Use an image")}
            </button>
            <button
              className="button subtle"
              onClick={() => {
                setActiveTexture(l.id);
                setPanel("layers");
              }}
            >
              {t("Edit texture")}
            </button>
          </div>
        );
      })()}
    </>
  );
}
