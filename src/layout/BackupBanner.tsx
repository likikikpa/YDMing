import type { ReadyApp } from "../app/useAppModel";

export function BackupBanner({ app }: { app: ReadyApp }) {
  const { backupDue, backupLater, saveError, saveProjectFile, t } = app;
  if (!backupDue || saveError) return null;
  return (
    <div className="backup-reminder">
      {t("Browser data can be cleared. Save this world to a file.")}
      <button onClick={saveProjectFile}>{t("Save world file")}</button>
      <button onClick={backupLater}>{t("Later")}</button>
    </div>
  );
}
