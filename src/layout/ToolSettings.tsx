import { colourTools, layerTools, paintTools } from "../app/constants";
import { BIOMES } from "../generator";
import { FogSettings } from "./FogSettings";
import { ScatterSettings } from "./ScatterSettings";
import { TerrainPaintSettings } from "./TerrainPaintSettings";
import { MAP_COLORS } from "../types";
import { Field, HexColorField, Slider } from "../ui/Field";
import type { ReadyApp } from "../app/useAppModel";

export function ToolSettings({ app }: { app: ReadyApp }) {
  const { brush, color, map, recentColors, setBrush, t, tool } = app;
  if (!(tool !== "select" && tool !== "hand")) return null;
  return (
    <div className="tool-settings">
      {!["river", "island", "room", "text", "eyedropper", "fill"].includes(
        tool,
      ) && (
        <Slider
          label={t(
            tool === "stamp" && map.kind === "world" && brush.scatter?.on
              ? "Stamp size"
              : "Brush size",
          )}
          value={brush.size}
          onChange={(v) => setBrush((b) => ({ ...b, size: v }))}
          min={4}
          max={200}
          suffix=" px"
        />
      )}
      {["raise", "dig", "smooth", "flatten", "roughen", "ridge"].includes(
        tool,
      ) ? (
        <Slider
          label={t("Strength")}
          value={brush.strength}
          onChange={(v) => setBrush((b) => ({ ...b, strength: v }))}
          min={5}
        />
      ) : (
        paintTools.includes(tool) && (
          <Slider
            label={t("Opacity")}
            value={brush.opacity}
            onChange={(v) => setBrush((b) => ({ ...b, opacity: v }))}
            min={5}
          />
        )
      )}
      <FogSettings app={app} />
      <ScatterSettings app={app} />
      <TerrainPaintSettings app={app} />
      {tool === "biome" && (
        <Field label={t("Biome")}>
          <select
            value={brush.biome}
            onChange={(e) =>
              setBrush((b) => ({ ...b, biome: +e.target.value }))
            }
          >
            {BIOMES.map((name, i) =>
              // Sea (12) is decided by height, so it is not paintable.
              i === 12 ? null : (
                <option key={name} value={i}>
                  {t(name)}
                </option>
              ),
            )}
          </select>
        </Field>
      )}
      {colourTools.includes(tool) && (
        <>
          <div className="colour-palette">
            {MAP_COLORS.map((c) => (
              <button
                aria-label={`Colour ${c}`}
                title={c}
                key={c}
                style={{ background: c }}
                className={brush.color === c ? "active" : ""}
                onClick={() => color(c)}
              />
            ))}
          </div>
          {recentColors.length > 0 && (
            <div className="recent-colors">
              {recentColors.map((c) => (
                <button
                  key={c}
                  title={c}
                  aria-label={`Recent colour ${c}`}
                  style={{ background: c }}
                  onClick={() => color(c)}
                />
              ))}
            </div>
          )}
          <div className="hex-input">
            <input
              aria-label="Colour picker"
              type="color"
              value={brush.color}
              onChange={(e) => color(e.target.value)}
            />
            <HexColorField value={brush.color} onChange={color} />
            <span>HEX</span>
          </div>
        </>
      )}
      {layerTools.includes(tool) && (
        <Field label={t("Active layer")}>
          <select
            value={brush.layer}
            onChange={(e) => setBrush((b) => ({ ...b, layer: e.target.value }))}
          >
            {map.layers.map((l) => (
              <option value={l.id} key={l.id}>
                {t(l.name)}
                {l.locked ? " 🔒" : ""}
              </option>
            ))}
          </select>
        </Field>
      )}
      {![
        "river",
        "island",
        "room",
        "text",
        "eyedropper",
        "fill",
        "fog",
      ].includes(tool) && (
        <label className="checkbox">
          <input
            type="checkbox"
            checked={brush.pressure}
            onChange={(e) =>
              setBrush((b) => ({ ...b, pressure: e.target.checked }))
            }
          />
          {t("Pressure sensitivity")}
        </label>
      )}
    </div>
  );
}
