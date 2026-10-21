import type { FitSettings } from "../assets";
import { Field, Slider } from "../ui/Field";
import { LoaderCircle, Plus } from "lucide-react";
import type { ReadyApp } from "../app/useAppModel";

export function FitImageModal({ app }: { app: ReadyApp }) {
  const {
    addStamp,
    fitBusy,
    fitCredit,
    fitPreview,
    fitSettings,
    setFitCredit,
    setFitSettings,
    t,
  } = app;
  return (
    <>
      <div className="fit-preview">
        {fitBusy ? (
          <LoaderCircle size={25} className="spin" />
        ) : (
          fitPreview && <img src={fitPreview.data} alt={t("Preview")} />
        )}
      </div>
      <div className="fit-options">
        {(
          [
            ["removeBackground", "Remove background"],
            ["trim", "Trim empty space"],
            ["parchment", "Parchment colours"],
            ["outline", "Ink outline"],
            ["shadow", "Drop shadow"],
            ["posterize", "Posterize"],
          ] as [keyof FitSettings, string][]
        ).map(([key, label]) => (
          <label className="checkbox" key={key}>
            <input
              type="checkbox"
              checked={!!fitSettings[key]}
              onChange={(e) =>
                setFitSettings((s) => ({
                  ...s,
                  [key]: e.target.checked,
                }))
              }
            />
            {t(label)}
          </label>
        ))}
      </div>
      {fitSettings.removeBackground && (
        <Slider
          label={t("Tolerance")}
          value={fitSettings.tolerance}
          onChange={(v) => setFitSettings((s) => ({ ...s, tolerance: v }))}
          min={1}
          max={60}
        />
      )}
      <Field label={t("Name")}>
        <input
          value={fitCredit.name}
          onChange={(e) =>
            setFitCredit((c) => ({ ...c, name: e.target.value }))
          }
        />
      </Field>
      <div className="credit-fields">
        <Field label={t("Author")}>
          <input
            value={fitCredit.author}
            onChange={(e) =>
              setFitCredit((c) => ({ ...c, author: e.target.value }))
            }
          />
        </Field>
        <Field label={t("Licence")}>
          <input
            value={fitCredit.license}
            onChange={(e) =>
              setFitCredit((c) => ({ ...c, license: e.target.value }))
            }
          />
        </Field>
      </div>
      <Field label={t("Source link")}>
        <input
          value={fitCredit.url}
          onChange={(e) => setFitCredit((c) => ({ ...c, url: e.target.value }))}
        />
      </Field>
      <button
        className="button brass full"
        disabled={!fitPreview || fitBusy}
        onClick={addStamp}
      >
        <Plus size={15} />
        {t("Add to library")}
      </button>
    </>
  );
}
