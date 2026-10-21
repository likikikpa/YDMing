import { primaryTools, toolInfo } from "../app/constants";
import { toolDescriptions } from "../tools";
import { IconButton } from "../ui/IconButton";
import {
  ArrowLeftRight,
  Check,
  HelpCircle,
  MoreHorizontal,
  Undo2,
  X,
} from "lucide-react";
import type { ReadyApp } from "../app/useAppModel";

export function ToolRail({ app }: { app: ReadyApp }) {
  const {
    brush,
    chooseTool,
    color,
    editor,
    panel,
    riverCount,
    secondary,
    setModal,
    setPanel,
    setSecondary,
    t,
    tool,
  } = app;
  return (
    <aside className="toolrail wood" aria-label="Map tools">
      {primaryTools.map((tools, i) => (
        <div className="tool-group" key={i}>
          {tools.map((key) => {
            const [name, Icon, shortcut] = toolInfo[key];
            return (
              <IconButton
                key={key}
                icon={Icon}
                title={t(name)}
                hint={t(toolDescriptions[key])}
                keys={shortcut || undefined}
                side="right"
                active={tool === key}
                onClick={() => chooseTool(key)}
              />
            );
          })}
        </div>
      ))}
      {tool === "river" && (
        <div className="tool-group">
          <IconButton
            icon={Check}
            title={t("Approve river")}
            hint={t(
              "Draw the river through the points you placed. Enter does the same.",
            )}
            keys="Enter"
            side="right"
            active={riverCount >= 2}
            disabled={riverCount < 2}
            onClick={() => editor.current?.finishRiver()}
          />
          <IconButton
            icon={Undo2}
            title={t("Remove last point")}
            keys="Backspace"
            side="right"
            disabled={riverCount === 0}
            onClick={() => editor.current?.undoRiverPoint()}
          />
          <IconButton
            icon={X}
            title={t("Cancel river")}
            keys="Esc"
            side="right"
            disabled={riverCount === 0}
            onClick={() => editor.current?.cancelRiver()}
          />
        </div>
      )}
      <IconButton
        icon={MoreHorizontal}
        title={t("More tools")}
        hint={t("Every tool, with what it does.")}
        side="right"
        active={panel === "tools"}
        onClick={() => setPanel(panel === "tools" ? "generate" : "tools")}
      />
      <div className="rail-colors">
        <input
          aria-label="Primary colour"
          type="color"
          value={brush.color}
          onChange={(e) => color(e.target.value)}
        />
        <input
          aria-label="Secondary colour"
          type="color"
          value={secondary}
          onChange={(e) => setSecondary(e.target.value)}
        />
        <button
          title="Swap colours · X"
          aria-label="Swap colours"
          onClick={() => {
            color(secondary);
            setSecondary(brush.color);
          }}
        >
          <ArrowLeftRight size={11} />
        </button>
      </div>
      <div className="rail-bottom">
        <IconButton
          icon={HelpCircle}
          title={t("Keyboard shortcuts")}
          onClick={() => setModal("help")}
        />
      </div>
    </aside>
  );
}
