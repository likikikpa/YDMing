import type { ReadyApp } from "../app/useAppModel";

export function HelpModal({ app }: { app: ReadyApp }) {
  const { t } = app;
  return (
    <>
      <div className="shortcut-list">
        {[
          ["V / H", "Select / Pan"],
          ["B / E", "Brush / Eraser"],
          ["A / Q", "Raise terrain / Dig terrain"],
          ["R / F / Y", "Smooth / Flatten / Roughen"],
          ["M / W / Z", "Mountain range / River / Island"],
          ["L / U / O", "Line / Rectangle / Ellipse"],
          ["S / T", "Place stamp / Text"],
          ["[ / ]", "Brush size"],
          ["X / D", "Swap / reset colours"],
          ["Space + drag", "Pan"],
          ["Scroll", "Zoom"],
          ["0", "Fit map"],
          ["Enter", "Generate a new map"],
          ["Ctrl Z", "Undo"],
          ["Ctrl Shift Z", "Redo"],
          ["Ctrl G", "Group"],
          ["Ctrl D", "Duplicate"],
          ["Ctrl S", "Save world file"],
          ["Tab", "Hide panels"],
        ].map(([key, name]) => (
          <div key={key}>
            <span>{t(name)}</span>
            <kbd>{key}</kbd>
          </div>
        ))}
      </div>
      <p className="panel-footnote">
        {t("Double-click a settlement to explore it.")} Shift: multi-select /
        keep aspect ratio. Alt: pick colour / scale from centre.
      </p>
    </>
  );
}
