import { exportMap } from "../export";
import { Field } from "../ui/Field";
import { Download } from "lucide-react";
import type { ReadyApp } from "../app/useAppModel";

export function ExportModal({ app }: { app: ReadyApp }) {
  const {
    busy,
    editor,
    exportFormat,
    exportScale,
    exportSecrets,
    lang,
    map,
    notify,
    project,
    saveProjectFile,
    setBusy,
    setExportFormat,
    setExportScale,
    setExportSecrets,
    setModal,
    t,
  } = app;
  return (
    <>
      <Field label={t("Format")}>
        <select
          value={exportFormat}
          onChange={(e) => setExportFormat(e.target.value)}
        >
          <option value="png">PNG image</option>
          <option value="pdf">
            PDF {map.kind === "dungeon" ? "+ room key" : ""}
          </option>
          <option value="vtt">Universal VTT (.dd2vtt)</option>
          <option value="project">{t("Project file")} (.ydming)</option>
        </select>
      </Field>
      {exportFormat !== "project" && (
        <>
          <Field label={t("Resolution")}>
            <select
              value={exportScale}
              onChange={(e) => setExportScale(+e.target.value)}
            >
              {[1, 2, 3]
                // Browsers refuse canvases much past ~120 million pixels.
                .filter(
                  (s) =>
                    s === 1 || map.width * map.height * s * s <= 120_000_000,
                )
                .map((s) => (
                  <option key={s} value={s}>
                    {s}× · {map.width * s} × {map.height * s}
                  </option>
                ))}
            </select>
          </Field>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={exportSecrets}
              onChange={(e) => setExportSecrets(e.target.checked)}
            />
            {t("Include GM secrets")}
          </label>
          <p className="panel-footnote">
            ZIP · {exportSecrets ? t("GM view") : t("Player view")}
          </p>
        </>
      )}
      <button
        className="button brass full"
        disabled={busy}
        onClick={async () => {
          if (exportFormat === "project") {
            saveProjectFile();
            setModal(null);
            return;
          }
          setBusy(true);
          try {
            await exportMap(
              project,
              map,
              editor.current!.exportCanvas(
                !exportSecrets,
                exportScale,
                exportFormat !== "vtt",
              ),
              exportFormat,
              !exportSecrets,
            );
            setModal(null);
            notify(lang === "ru" ? "Карта экспортирована." : "Map exported.");
          } catch (e) {
            notify(String(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <Download size={16} />
        {t("Download")}
      </button>
    </>
  );
}
