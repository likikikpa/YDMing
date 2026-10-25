import { labelWidth } from "../labels";
import { MAP_FONTS, styleFont } from "../map-fonts";
import { Field, Slider } from "../ui/Field";
import type { ReadyApp } from "../app/useAppModel";
import type { MapObject } from "../types";

/** Lettering of a selected label: its face, colour, curve and letter spacing. */
export function LabelStyleFields({ app }: { app: ReadyApp }) {
  const { map, selection, t, updateSelected } = app;
  const o = selection[0];
  if (o?.kind !== "label") return null;
  const style = map.settings.style,
    fallback = MAP_FONTS.find((f) => f.id === styleFont(style));
  // A wider face or more spacing widens a single label's box, so its letters
  // are not squeezed to fit it.
  const restyle = (change: Partial<MapObject>, label: string, merge = false) =>
    updateSelected(
      selection.length === 1
        ? {
            ...change,
            width: Math.max(
              o.width,
              Math.ceil(labelWidth({ ...o, ...change }, style)),
            ),
          }
        : change,
      label,
      merge,
    );
  return (
    <div className="label-style">
      <div className="label-style-pair">
        <Field label={t("Font")}>
          <select
            value={o.font ?? ""}
            onChange={(e) =>
              restyle({ font: e.target.value || undefined }, "Edit label")
            }
          >
            <option value="">
              {t("Map style")} ({fallback?.name})
            </option>
            {MAP_FONTS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("Colour")}>
          <input
            type="color"
            value={o.color}
            onChange={(e) =>
              updateSelected({ color: e.target.value }, "Label colour", true)
            }
          />
        </Field>
      </div>
      <div className="label-style-pair">
        <Slider
          label={t("Curve")}
          value={Math.round((o.curve ?? 0) * 100)}
          onChange={(v) =>
            updateSelected(
              { curve: v ? v / 100 : undefined },
              "Curve label",
              true,
            )
          }
          min={-100}
          max={100}
          suffix=""
        />
        <Slider
          label={t("Letter spacing")}
          value={Math.round((o.spacing ?? 0) * 100)}
          onChange={(v) =>
            restyle({ spacing: v ? v / 100 : undefined }, "Space letters", true)
          }
          min={0}
          max={100}
        />
      </div>
    </div>
  );
}
