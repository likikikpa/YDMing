import { useState } from "react";
import type { BrushSettings } from "../editor/types";
import { DEFAULT_SCATTER } from "../scatter-brush";
import { mixKey, withMix } from "../scatter-mixes";
import type { Project, ScatterMix } from "../types";
import type { ModalName } from "./constants";

/** The world's saved scatter mixes, and the dialog that makes and changes them. */
export function useScatterMixes({
  project,
  commit,
  setBrush,
  setModal,
}: {
  project: Project | null;
  commit: (next: Project, label: string) => void;
  setBrush: (change: (b: BrushSettings) => BrushSettings) => void;
  setModal: (modal: ModalName | null) => void;
}) {
  /** The mix the dialog changes; empty for a new one. */
  const [mixEdit, setMixEdit] = useState("");
  const mixes = project?.scatterMixes ?? [];
  /** Opens the dialog on a mix, or on a new one with no id. */
  function openMix(id = "") {
    setMixEdit(id);
    setModal("mix");
  }
  /** Saves the mix and scatters with it. */
  function saveMix(mix: ScatterMix) {
    if (!project) return;
    commit(
      { ...project, scatterMixes: withMix(mixes, mix) },
      "Save scatter mix",
    );
    setBrush((b) => ({
      ...b,
      scatter: {
        ...(b.scatter ?? DEFAULT_SCATTER),
        on: true,
        kind: mixKey(mix.id),
      },
    }));
    setModal(null);
  }
  function deleteMix(id: string) {
    if (!project) return;
    commit(
      { ...project, scatterMixes: mixes.filter((m) => m.id !== id) },
      "Delete scatter mix",
    );
    setBrush((b) =>
      b.scatter?.kind === mixKey(id)
        ? { ...b, scatter: { ...b.scatter, kind: "" } }
        : b,
    );
    setModal(null);
  }
  return { mixes, mixEdit, openMix, saveMix, deleteMix };
}
