import { IconButton } from "../ui/IconButton";
import { Camera, Check } from "lucide-react";
import type { ReadyApp } from "../app/useAppModel";

export function HistoryPanel({ app }: { app: ReadyApp }) {
  const {
    commit,
    history,
    historyIndex,
    project,
    setHistoryIndex,
    setProject,
    setSelected,
    setSnapshotName,
    snapshotName,
    snapshots,
    t,
    takeSnapshot,
  } = app;
  const ownSnapshots = snapshots.filter((s) => s.project.id === project.id);
  return (
    <>
      <div className="panel-heading">
        <span className="section-kicker">{t("History")}</span>
      </div>
      <div className="snapshot-form">
        <input
          placeholder={t("Snapshot")}
          value={snapshotName}
          onChange={(e) => setSnapshotName(e.target.value)}
        />
        <IconButton
          icon={Camera}
          title={t("Create snapshot")}
          onClick={takeSnapshot}
        />
      </div>
      <h3 className="section-kicker">{t("Named snapshots")}</h3>
      {ownSnapshots.length === 0 && (
        <p className="panel-footnote">{t("No snapshots yet.")}</p>
      )}
      {ownSnapshots.map((s) => (
        <div className="snapshot-row" key={s.id}>
          <Camera size={14} />
          <span>{s.name}</span>
          <button
            onClick={() => {
              // A snapshot restores into the open world and never moves it to another id.
              commit(
                { ...structuredClone(s.project), id: project.id },
                "Restore snapshot",
              );
              setSelected([]);
            }}
          >
            {t("Restore")}
          </button>
        </div>
      ))}
      <h3 className="section-kicker history-title">{t("Project history")}</h3>
      <div className="history-list">
        {history
          .map((entry, i) => (
            <button
              key={i}
              className={`${i === historyIndex ? "current" : ""} ${i > historyIndex ? "future" : ""}`}
              onClick={() => {
                setProject(entry.project);
                setHistoryIndex(i);
                setSelected([]);
              }}
            >
              <span className="history-node" />
              {t(entry.label)}
              {i === historyIndex && <Check size={13} />}
            </button>
          ))
          .reverse()}
      </div>
    </>
  );
}
