import { Field } from "../ui/Field";
import { MapSizeFields } from "../ui/MapSizeFields";
import { Maximize2 } from "lucide-react";
import type { ReadyApp } from "../app/useAppModel";

export function ResizeModal({ app }: { app: ReadyApp }) {
  const { applyResize, resize, setResize, t } = app;
  return (
    <>
      <MapSizeFields
        t={t}
        size={resize}
        onChange={(s) => setResize({ ...resize, ...s })}
      />
      <Field label={t("Keep the map at")}>
        <div className="anchor-grid" role="radiogroup">
          {([0, 0.5, 1] as const).flatMap((y) =>
            ([0, 0.5, 1] as const).map((x) => (
              <button
                key={`${x}-${y}`}
                role="radio"
                aria-checked={resize.anchor.x === x && resize.anchor.y === y}
                aria-label={`${t(y === 0 ? "Top" : y === 1 ? "Bottom" : "Middle")} ${t(x === 0 ? "left" : x === 1 ? "right" : "centre")}`}
                className={
                  resize.anchor.x === x && resize.anchor.y === y ? "active" : ""
                }
                onClick={() => setResize({ ...resize, anchor: { x, y } })}
              />
            )),
          )}
        </div>
      </Field>
      <button className="button brass full" onClick={applyResize}>
        <Maximize2 size={16} /> {t("Resize map")}
      </button>
    </>
  );
}
