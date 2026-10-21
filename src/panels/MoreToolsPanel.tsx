import { toolInfo } from "../app/constants";
import type { Tool } from "../types";
import type { ReadyApp } from "../app/useAppModel";

export function MoreToolsPanel({ app }: { app: ReadyApp }) {
  const { chooseTool, t, tool } = app;
  return (
    <>
      <div className="panel-heading">
        <span className="section-kicker">{t("More tools")}</span>
      </div>
      <div className="all-tools">
        {Object.entries(toolInfo).map(([key, [name, Icon, shortcut]]) => (
          <button
            key={key}
            className={tool === key ? "active" : ""}
            onClick={() => chooseTool(key as Tool)}
          >
            <Icon size={17} />
            {t(name)}
            <kbd>{shortcut}</kbd>
          </button>
        ))}
      </div>
    </>
  );
}
