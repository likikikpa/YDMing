import { useState } from "react";
import { Layers2, Trash2 } from "lucide-react";
import type { Scene } from "../scenes";
import type { ReadyApp } from "../app/useAppModel";

export function ScenesTab({ app }: { app: ReadyApp }) {
  const {
    builtinScenes,
    deleteScene,
    myScenes,
    placeScene,
    saveScene,
    selected,
    t,
  } = app;
  const [name, setName] = useState("");
  const row = (scene: Scene, mine: boolean) => (
    <div className="scene-row" key={scene.id}>
      <button onClick={() => placeScene(scene)}>
        <Layers2 size={15} />
        {mine ? scene.name : t(scene.name)}
        <kbd>{scene.clip.objects.length + scene.clip.paths.length}</kbd>
      </button>
      {mine && (
        <button
          className="scene-delete"
          aria-label={t("Delete scene")}
          title={t("Delete scene")}
          onClick={() => void deleteScene(scene.id)}
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
  return (
    <>
      <div className="scene-save">
        <input
          aria-label={t("Scene name")}
          placeholder={t("Scene name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          className="button subtle"
          disabled={!selected.length}
          onClick={() => {
            void saveScene(name);
            setName("");
          }}
        >
          {t("Save selection")}
        </button>
      </div>
      <div className="scene-list">
        {builtinScenes.map((s) => row(s, false))}
        {myScenes.map((s) => row(s, true))}
      </div>
    </>
  );
}
