import {
  clampSize,
  MAX_CELLS,
  MIN_COLS,
  MIN_ROWS,
  SIZE_PRESETS,
} from "../mapsize";
import { Field } from "./Field";

/** Width and height in cells, with presets; shows the size in pixels too. */
export function MapSizeFields({
  t,
  size,
  onChange,
}: {
  t: (s: string) => string;
  size: { cols: number; rows: number };
  onChange: (size: { cols: number; rows: number }) => void;
}) {
  const preset = SIZE_PRESETS.find(
    (p) => p.cols === size.cols && p.rows === size.rows,
  );
  return (
    <>
      <Field label={t("Map size")}>
        <select
          value={preset?.name ?? "custom"}
          onChange={(e) => {
            const p = SIZE_PRESETS.find((p) => p.name === e.target.value);
            if (p) onChange({ cols: p.cols, rows: p.rows });
          }}
        >
          {SIZE_PRESETS.map((p) => (
            <option key={p.name} value={p.name}>
              {t(p.name)} · {p.cols} × {p.rows}
            </option>
          ))}
          <option value="custom">{t("Custom")}</option>
        </select>
      </Field>
      <div className="size-fields">
        {(["cols", "rows"] as const).map((key) => (
          <label key={key}>
            {t(key === "cols" ? "Width" : "Height")}
            <input
              type="number"
              min={key === "cols" ? MIN_COLS : MIN_ROWS}
              max={MAX_CELLS}
              value={size[key]}
              onChange={(e) => onChange({ ...size, [key]: +e.target.value })}
              onBlur={() => onChange(clampSize(size.cols, size.rows))}
            />
          </label>
        ))}
        <span>
          {t("cells")} · {clampSize(size.cols, size.rows).cols * 5} ×{" "}
          {clampSize(size.cols, size.rows).rows * 5} px
        </span>
      </div>
      <p className="panel-footnote">
        {t("Up to 640 × 640 cells (3200 × 3200 px).")}
      </p>
    </>
  );
}
