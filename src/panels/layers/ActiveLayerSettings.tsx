import { Field, Slider } from "../../ui/Field";
import type { ReadyApp } from "../../app/useAppModel";

export function ActiveLayerSettings({ app }: { app: ReadyApp }) {
  const { activeLayer, map, mutateMap, t } = app;
  const l = map.layers.find((l) => l.id === activeLayer) || map.layers[0];
  return (
    <div className="layer-settings">
      <Slider
        label={t("Opacity")}
        value={Math.round(l.opacity * 100)}
        onChange={(v) =>
          mutateMap(
            (m) => (m.layers.find((n) => n.id === l.id)!.opacity = v / 100),
            "Layer opacity",
          )
        }
      />
      <Field label={t("Blend mode")}>
        <select
          value={l.blend}
          onChange={(e) =>
            mutateMap(
              (m) =>
                (m.layers.find((n) => n.id === l.id)!.blend = e.target
                  .value as GlobalCompositeOperation),
              "Layer blend mode",
            )
          }
        >
          {[
            ["source-over", "Normal"],
            ["multiply", "Multiply"],
            ["screen", "Screen"],
            ["overlay", "Overlay"],
          ].map(([v, n]) => (
            <option key={v} value={v}>
              {t(n)}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}
