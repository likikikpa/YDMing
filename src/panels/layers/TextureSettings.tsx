import { BUILTIN_MATERIALS, PATTERNS } from "../../materials";
import { textureColour } from "../../terrain-render";
import type { TextureLayer, TextureTiling } from "../../types";
import { Field, Slider } from "../../ui/Field";
import { ImagePlus, Trash2, X } from "lucide-react";
import type { ReadyApp } from "../../app/useAppModel";

export function TextureSettings({ app }: { app: ReadyApp }) {
  const {
    activeTexture,
    changeTextures,
    coverInput,
    deleteTexture,
    map,
    replaceWith,
    setReplaceWith,
    t,
    textureInput,
    textures,
  } = app;
  const l = textures.find((l) => l.id === activeTexture) || textures[0];
  const edit = (change: (n: TextureLayer) => void, label: string) =>
    changeTextures((list) => change(list.find((n) => n.id === l.id)!), label);
  const custom = !BUILTIN_MATERIALS.includes(l.id);
  return (
    <div className="layer-settings texture-settings">
      <Field label={t("Name")}>
        <input
          value={l.name}
          onChange={(e) =>
            edit((n) => (n.name = e.target.value), "Rename texture")
          }
        />
      </Field>
      <Field label={t("Pattern")}>
        <select
          value={l.pattern}
          disabled={!!l.image}
          onChange={(e) =>
            edit(
              (n) => (n.pattern = e.target.value as TextureLayer["pattern"]),
              "Texture pattern",
            )
          }
        >
          {PATTERNS.map((p) => (
            <option key={p} value={p}>
              {t(p[0].toUpperCase() + p.slice(1))}
            </option>
          ))}
        </select>
      </Field>
      <div className="texture-actions">
        <button
          className="button subtle"
          onClick={() => textureInput.current?.click()}
        >
          <ImagePlus size={13} />
          {t(l.image ? "Replace image" : "Use an image")}
        </button>
        {l.image && (
          <button
            className="button subtle"
            onClick={() => edit((n) => delete n.image, "Remove texture image")}
          >
            <X size={13} />
            {t("Remove image")}
          </button>
        )}
      </div>
      <Field label={t("Colour")}>
        <div className="texture-tint">
          <input
            type="color"
            aria-label={t("Colour")}
            disabled={!!l.image}
            value={textureColour(l, map.settings.style)}
            onChange={(e) =>
              edit((n) => (n.tint = e.target.value), "Texture colour")
            }
          />
          <button
            className="button subtle"
            disabled={!l.tint || !!l.image}
            onClick={() => edit((n) => delete n.tint, "Texture colour")}
          >
            {t("Map style colour")}
          </button>
        </div>
      </Field>
      <Slider
        label={t("Tile size")}
        value={l.scale}
        min={25}
        max={400}
        suffix="%"
        onChange={(v) => edit((n) => (n.scale = v), "Texture size")}
      />
      <Slider
        label={t("Pattern strength")}
        value={l.strength}
        min={0}
        onChange={(v) => edit((n) => (n.strength = v), "Texture strength")}
      />
      <Field label={t("Repetition")}>
        <select
          value={l.tiling ?? "blended"}
          onChange={(e) => {
            const tiling = e.target.value as TextureTiling;
            if (tiling === "unveil" && !l.cover) coverInput.current?.click();
            else edit((n) => (n.tiling = tiling), "Texture repetition");
          }}
        >
          <option value="blended">{t("Blended (no visible repeats)")}</option>
          <option value="tiled">{t("Tiled (repeats exactly)")}</option>
          <option value="unveil">{t("Unveil a map-wide image")}</option>
        </select>
      </Field>
      {(l.tiling === "unveil" || l.cover) && (
        <div className="texture-actions">
          <button
            className="button subtle"
            onClick={() => coverInput.current?.click()}
          >
            <ImagePlus size={13} />
            {t(l.cover ? "Replace map image" : "Upload map image")}
          </button>
          {l.cover && (
            <button
              className="button subtle"
              onClick={() =>
                edit((n) => {
                  delete n.cover;
                  if (n.tiling === "unveil") n.tiling = "blended";
                }, "Remove texture map image")
              }
            >
              <X size={13} />
              {t("Remove map image")}
            </button>
          )}
        </div>
      )}

      {custom && (
        <div className="texture-delete">
          <Field label={t("Replace painted ground with")}>
            <select
              value={replaceWith}
              onChange={(e) => setReplaceWith(e.target.value)}
            >
              <option value="">{t("Auto")}</option>
              {textures
                .filter((o) => o.id !== l.id && !o.id.endsWith("water"))
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {t(o.name)}
                  </option>
                ))}
            </select>
          </Field>
          <button
            className="button subtle full"
            onClick={() => deleteTexture(l.id, replaceWith || null)}
          >
            <Trash2 size={13} />
            {t("Delete texture layer")}
          </button>
        </div>
      )}
    </div>
  );
}
