import type { Panel } from "../app/constants";
import { ToolCard } from "./ToolCard";
import { HistoryPanel } from "../panels/HistoryPanel";
import { LibraryPanel } from "../panels/LibraryPanel";
import { MoreToolsPanel } from "../panels/MoreToolsPanel";
import { RoomsPanel } from "../panels/RoomsPanel";
import { GeneratorPanel } from "../panels/generator/GeneratorPanel";
import { LayersPanel } from "../panels/layers/LayersPanel";
import { History, Layers, SlidersHorizontal, Trees } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReadyApp } from "../app/useAppModel";

export function Sidebar({ app }: { app: ReadyApp }) {
  const { panel, setPanel, t } = app;
  return (
    <aside className="sidebar wood">
      <ToolCard app={app} />
      <div className="panel-tabs">
        {(
          [
            ["generate", SlidersHorizontal, "Generator"],
            ["layers", Layers, "Layers"],
            ["library", Trees, "Library"],
            ["history", History, "History"],
          ] as [Panel, LucideIcon, string][]
        ).map(([id, Icon, label]) => (
          <button
            key={id}
            className={panel === id ? "active" : ""}
            title={t(label)}
            onClick={() => setPanel(id)}
          >
            <Icon size={17} />
            <span>{t(label)}</span>
          </button>
        ))}
      </div>
      <div className="panel-scroll">
        {panel === "generate" && <GeneratorPanel app={app} />}
        {panel === "layers" && <LayersPanel app={app} />}
        {panel === "library" && <LibraryPanel app={app} />}
        {panel === "history" && <HistoryPanel app={app} />}
        {panel === "tools" && <MoreToolsPanel app={app} />}
        {panel === "rooms" && <RoomsPanel app={app} />}
      </div>
    </aside>
  );
}
