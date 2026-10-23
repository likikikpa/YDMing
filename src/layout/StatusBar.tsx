import { toolInfo } from "../app/constants";
import { CursorReadout } from "../ui/Readouts";
import { Expand } from "lucide-react";
import type { ReadyApp } from "../app/useAppModel";

export function StatusBar({ app }: { app: ReadyApp }) {
  const { map, openResize, setHidePanels, t, tool } = app;
  return (
    <footer className="statusbar wood">
      <div>
        <span className="status-tool">{t(toolInfo[tool][0])}</span>
      </div>
      <div className="cursor-status">
        <CursorReadout world={map.kind === "world"} t={t} />
        <span className="status-separator" />
        {map.kind === "dungeon" ? (
          <span>
            {map.width} × {map.height}
          </span>
        ) : (
          <button
            className="status-size"
            title={t("Resize map")}
            onClick={openResize}
          >
            {map.width} × {map.height}
          </button>
        )}
      </div>
      <button
        title={`${t("Hide panels")} · Tab`}
        onClick={() => setHidePanels((v) => !v)}
      >
        <Expand size={12} />
        <kbd>Tab</kbd>
      </button>
    </footer>
  );
}
