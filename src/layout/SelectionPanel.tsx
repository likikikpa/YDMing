import { Field } from "../ui/Field";
import { IconButton } from "../ui/IconButton";
import {
  AlignStartHorizontal,
  AlignStartVertical,
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpToLine,
  Copy,
  FlipHorizontal2,
  FlipVertical2,
  Group,
  Trash2,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReadyApp } from "../app/useAppModel";
import { LabelStyleFields } from "./LabelStyleFields";
import { MapLinkField } from "./MapLinkField";
import { NoteLinkField } from "./NoteLinkField";

export function SelectionPanel({ app }: { app: ReadyApp }) {
  const {
    arrange,
    deleteObjects,
    duplicate,
    groupObjects,
    map,
    selection,
    setSelected,
    t,
    updateSelected,
  } = app;
  if (!(selection.length > 0)) return null;
  return (
    <section className="selection-panel">
      <div className="section-kicker">
        {t("Selected object")}{" "}
        <button className="plain-button" onClick={() => setSelected([])}>
          <X size={13} />
        </button>
      </div>
      <input
        className="object-name"
        aria-label={t("Name")}
        value={selection[0].name}
        onChange={(e) => updateSelected({ name: e.target.value })}
      />
      <div className="transform-fields">
        {(["x", "y", "width", "height", "rotation"] as const).map((key, i) => (
          <label key={key}>
            {["X", "Y", "W", "H", "°"][i]}
            <input
              aria-label={`Object ${key}`}
              type="number"
              value={Math.round(selection[0][key])}
              min={key === "width" || key === "height" ? 4 : undefined}
              onChange={(e) =>
                updateSelected({ [key]: Number(e.target.value) })
              }
            />
          </label>
        ))}
      </div>
      <LabelStyleFields app={app} />
      <div className="object-actions">
        {(
          [
            [
              FlipHorizontal2,
              "Flip horizontal",
              () => updateSelected({ flipX: !selection[0].flipX }),
            ],
            [
              FlipVertical2,
              "Flip vertical",
              () => updateSelected({ flipY: !selection[0].flipY }),
            ],
            [Copy, "Duplicate", duplicate],
            [Trash2, "Delete", deleteObjects],
            [Group, "Group", groupObjects],
            [AlignStartVertical, "Align left", () => arrange("left")],
            [AlignStartHorizontal, "Align top", () => arrange("top")],
            [
              ArrowLeftRight,
              "Distribute horizontally",
              () => arrange("distribute"),
            ],
            [ArrowUpToLine, "Bring forward", () => arrange("front")],
            [ArrowDownToLine, "Send backward", () => arrange("back")],
          ] as [LucideIcon, string, () => void][]
        ).map(([icon, title, fn]) => (
          <IconButton key={title} icon={icon} title={t(title)} onClick={fn} />
        ))}
      </div>
      {map.kind === "city" && (
        <>
          <Field label={t("Owner")}>
            <input
              value={selection[0].owner || ""}
              onChange={(e) => updateSelected({ owner: e.target.value })}
            />
          </Field>
          <Field label={t("Notes for the GM")}>
            <textarea
              rows={2}
              value={selection[0].notes || ""}
              onChange={(e) => updateSelected({ notes: e.target.value })}
            />
          </Field>
        </>
      )}
      <NoteLinkField
        label={t("Note")}
        value={selection[0].noteUrl}
        onChange={(noteUrl) => updateSelected({ noteUrl }, "Edit note link")}
        t={t}
      />
      {selection[0].kind !== "label" && (
        <MapLinkField app={app} o={selection[0]} />
      )}
    </section>
  );
}
