import { toolInfo } from "../app/constants";
import { SelectionPanel } from "./SelectionPanel";
import { ToolSettings } from "./ToolSettings";
import { ChevronDown } from "lucide-react";
import type { ReadyApp } from "../app/useAppModel";

export function ToolCard({ app }: { app: ReadyApp }) {
  const { setToolCardOpen, t, tool, toolCardOpen } = app;
  return (
    <section
      className={`tool-card ${toolCardOpen ? "" : "collapsed"}`}
      aria-label={t("Current tool")}
    >
      <button
        className="tool-card-title"
        aria-expanded={toolCardOpen}
        title={t(toolCardOpen ? "Collapse" : "Expand")}
        onClick={() => {
          const open = !toolCardOpen;
          setToolCardOpen(open);
          try {
            localStorage.setItem("ydming-tool-card", open ? "open" : "closed");
          } catch {
            // Storage can be unavailable (private mode); the card still works.
          }
        }}
      >
        <span className="section-kicker">{t("Current tool")}</span>
        <strong>{t(toolInfo[tool][0])}</strong>
        {toolInfo[tool][2] && <kbd>{toolInfo[tool][2]}</kbd>}
        <ChevronDown size={13} />
      </button>
      {toolCardOpen && (
        <div className="tool-card-body">
          <SelectionPanel app={app} />
          <ToolSettings app={app} />
        </div>
      )}
    </section>
  );
}
