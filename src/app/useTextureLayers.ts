import { useEffect, useMemo, useRef, useState } from "react";
import type { BrushSettings } from "../Editor";
import {
  defaultTextures,
  isBuiltinMaterial,
  newTextureLayer,
  paintedCellCount,
  replaceMaterial,
  TEXTURE_SOFT_LIMIT,
} from "../materials";
import { setTextureLayers } from "../terrain-render";
import { uid } from "../types";
import type { Project, TextureLayer } from "../types";

/** The project's texture layers: editing, uploading images, adding and deleting. */
export function useTextureLayers({
  project,
  commit,
  notify,
  t,
  brush,
  setBrush,
}: {
  project: Project | null;
  commit: (next: Project, label: string) => void;
  notify: (message: string) => void;
  t: (s: string) => string;
  brush: BrushSettings;
  setBrush: React.Dispatch<React.SetStateAction<BrushSettings>>;
}) {
  const [textureVersion, setTextureVersion] = useState(0);
  const textureInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const [activeTexture, setActiveTexture] = useState("grass");
  const [replaceWith, setReplaceWith] = useState("grass");
  const [dragTexture, setDragTexture] = useState<string | null>(null);
  const textures = useMemo(
    () => project?.textures ?? defaultTextures(),
    [project?.textures],
  );
  useEffect(() => {
    let active = true;
    void setTextureLayers(textures).then(() => {
      if (active) setTextureVersion((v) => v + 1);
    });
    return () => {
      active = false;
    };
  }, [textures]);
  /** Shrinks an image to one seamless-size tile and uses it for a texture layer. */
  async function uploadTexture(id: string, file: File) {
    try {
      const bitmap = await createImageBitmap(file),
        canvas = document.createElement("canvas");
      canvas.width = canvas.height = 128;
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, 128, 128);
      const image = canvas.toDataURL("image/png");
      changeTextures((list) => {
        list.find((n) => n.id === id)!.image = image;
      }, "Texture image");
      const cells = project ? paintedCellCount(project.maps, id) : 0;
      if (cells) notify(`${t("Texture replaced on painted cells:")} ${cells}`);
    } catch {
      notify(t("That image could not be read."));
    }
  }
  /**
   * Uses an image as a layer's map-wide cover, which painting that layer
   * unveils. It is shrunk to at most 2048 px and stored as JPEG to keep saves small.
   */
  async function uploadCover(id: string, file: File) {
    try {
      const bitmap = await createImageBitmap(file),
        fit = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height)),
        canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * fit));
      canvas.height = Math.max(1, Math.round(bitmap.height * fit));
      canvas
        .getContext("2d")!
        .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const cover = canvas.toDataURL("image/jpeg", 0.85);
      changeTextures((list) => {
        const n = list.find((n) => n.id === id)!;
        n.cover = cover;
        n.tiling = "unveil";
      }, "Texture map image");
    } catch {
      notify(t("That image could not be read."));
    }
  }
  /** Adds a custom texture layer, warning once the soft limit is passed, and selects it. */
  function addTexture() {
    const id = uid();
    changeTextures(
      (list) => list.push(newTextureLayer(id, list, t("Texture"))),
      "Add texture layer",
    );
    setActiveTexture(id);
    setBrush((b) => ({ ...b, material: id }));
    if (textures.length >= TEXTURE_SOFT_LIMIT)
      notify(
        `${t("Many texture layers can slow the map down.")} ${textures.length + 1}/${TEXTURE_SOFT_LIMIT}`,
      );
  }
  /** Deletes a texture layer; ground painted with it on every map becomes `to`. */
  function deleteTexture(id: string, to: string | null) {
    if (!project || isBuiltinMaterial(id)) return;
    const next = structuredClone(project);
    next.textures = (next.textures ?? defaultTextures()).filter(
      (l) => l.id !== id,
    );
    for (const m of next.maps) replaceMaterial(m, id, to);
    commit(next, "Delete texture layer");
    setActiveTexture("grass");
    if (brush.material === id) setBrush((b) => ({ ...b, material: to ?? "" }));
  }
  /** Replaces the project's texture layers as one undo step. */
  const changeTextures = (
    change: (layers: TextureLayer[]) => void,
    label: string,
  ) => {
    if (!project) return;
    const next = structuredClone(textures);
    change(next);
    commit({ ...project, textures: next }, label);
  };
  return {
    textures,
    textureVersion,
    textureInput,
    coverInput,
    activeTexture,
    setActiveTexture,
    replaceWith,
    setReplaceWith,
    dragTexture,
    setDragTexture,
    uploadTexture,
    uploadCover,
    addTexture,
    deleteTexture,
    changeTextures,
  };
}
