import { saveWorld } from "../worlds";
import type { ReadyApp } from "../app/useAppModel";

export function SaveErrorBanner({ app }: { app: ReadyApp }) {
  const { notify, project, saveError, saveProjectFile, setSaveError, t } = app;
  if (!saveError) return null;
  return (
    <div className="save-error">
      {saveError}
      <button onClick={saveProjectFile}>{t("Save world file")}</button>
      <button
        onClick={() =>
          void saveWorld(project)
            .then(() => setSaveError(""))
            .catch(() => notify(saveError))
        }
      >
        {t("Retry saving")}
      </button>
    </div>
  );
}
