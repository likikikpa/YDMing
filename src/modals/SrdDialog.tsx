import { X } from "lucide-react";
import type { ReadyApp } from "../app/useAppModel";

export function SrdDialog({ app }: { app: ReadyApp }) {
  const { setSrdDetail, srdDetail } = app;
  if (!srdDetail) return null;
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setSrdDetail(null);
      }}
    >
      <section
        className="modal stat-block wood"
        role="dialog"
        aria-modal="true"
        aria-label={srdDetail.name}
      >
        <button
          className="modal-close icon-button"
          onClick={() => setSrdDetail(null)}
        >
          <X size={18} />
        </button>
        <span className="section-kicker">SRD 5.2 · CC BY 4.0</span>
        <h2>{srdDetail.name}</h2>
        {srdDetail.kind === "monster" && (
          <div className="stat-numbers">
            <span>
              CR <b>{srdDetail.cr}</b>
            </span>
            <span>
              AC <b>{srdDetail.ac}</b>
            </span>
            <span>
              HP <b>{srdDetail.hp}</b>
            </span>
            <span>
              XP <b>{srdDetail.xp}</b>
            </span>
          </div>
        )}
        {srdDetail.rarity && (
          <span className="licence-tag">{srdDetail.rarity}</span>
        )}
        <p>{srdDetail.description}</p>
        <div className="stat-description">
          {srdDetail.details?.split("\n\n").map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </section>
    </div>
  );
}
