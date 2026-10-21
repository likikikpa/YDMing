import { CreditsModal } from "./CreditsModal";
import { ExportModal } from "./ExportModal";
import { FitImageModal } from "./FitImageModal";
import { HelpModal } from "./HelpModal";
import { NewMapModal } from "./NewMapModal";
import { ResizeModal } from "./ResizeModal";
import { X } from "lucide-react";
import type { ReadyApp } from "../app/useAppModel";

export function ModalHost({ app }: { app: ReadyApp }) {
  const { modal, setModal, t } = app;
  if (!modal) return null;
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setModal(null);
      }}
    >
      <section
        className={`modal wood ${modal === "fit" ? "fit-modal" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <button
          className="modal-close icon-button"
          aria-label={t("Close")}
          onClick={() => setModal(null)}
        >
          <X size={19} />
        </button>
        <span className="section-kicker">
          ATLASFORGE /{" "}
          {t(
            modal === "new"
              ? "New adventure"
              : modal === "export"
                ? "Export"
                : modal === "credits"
                  ? "Credits"
                  : modal === "help"
                    ? "Keyboard shortcuts"
                    : modal === "resize"
                      ? "Map size"
                      : "Library",
          )}
        </span>
        <h2 id="modal-title">
          {t(
            modal === "new"
              ? "New map"
              : modal === "export"
                ? "Export map"
                : modal === "credits"
                  ? "Credits"
                  : modal === "help"
                    ? "Keyboard shortcuts"
                    : modal === "resize"
                      ? "Resize map"
                      : "Make it fit",
          )}
        </h2>
        {modal === "new" && <NewMapModal app={app} />}
        {modal === "resize" && <ResizeModal app={app} />}
        {modal === "export" && <ExportModal app={app} />}
        {modal === "credits" && <CreditsModal app={app} />}
        {modal === "help" && <HelpModal app={app} />}
        {modal === "fit" && <FitImageModal app={app} />}
      </section>
    </div>
  );
}
