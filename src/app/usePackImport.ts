import { useRef } from "react";
import { set } from "idb-keyval";
import { fitImage } from "../assets";
import { getWithLegacy } from "../legacy-keys";
import { packImages } from "../pack-import";
import { uid } from "../types";
import type { Credit, MapObject, Project } from "../types";
import { emptyFit } from "./constants";
import type { Panel } from "./constants";

/** Pictures in a pack are shrunk to this many pixels on the long side. */
const STAMP_SIZE = 512;

/** Adds every picture of a stamp pack (image files or a ZIP) to My stamps in one step. */
export function usePackImport({
  projectRef,
  commit,
  notify,
  t,
  color,
  myStamps,
  setMyStamps,
  setLibraryTab,
  setPanel,
}: {
  projectRef: React.RefObject<Project | null>;
  commit: (next: Project, label: string) => void;
  notify: (message: string) => void;
  t: (s: string) => string;
  color: string;
  myStamps: MapObject[];
  setMyStamps: (stamps: MapObject[]) => void;
  setLibraryTab: (tab: string) => void;
  setPanel: (panel: Panel) => void;
}) {
  const packInput = useRef<HTMLInputElement>(null);
  async function importPack(files: File[]) {
    if (!projectRef.current) return;
    let images;
    try {
      images = await packImages(files);
    } catch (e) {
      notify((e as Error).message);
      return;
    }
    if (!images.length) {
      notify(t("No PNG, JPEG or WebP pictures found."));
      return;
    }
    const credit: Credit = {
      id: uid(),
      name: `Imported pack: ${files[0].name}`,
      author: "You",
      license: "Private asset",
      url: "",
    };
    const stamps: MapObject[] = [];
    for (const [i, image] of images.entries()) {
      try {
        const fit = await fitImage(image.blob, emptyFit, STAMP_SIZE);
        stamps.push({
          id: uid(),
          kind: "image",
          x: 600,
          y: 425,
          name: image.name,
          width: 80,
          height: (80 * fit.height) / fit.width,
          rotation: 0,
          layer: "Objects",
          color,
          image: fit.data,
          creditId: credit.id,
        });
      } catch {
        // A picture that cannot be opened is left out; the rest still import.
      }
      if (i % 10 === 9) notify(`${t("Importing")} ${i + 1} / ${images.length}`);
    }
    if (!stamps.length) {
      notify(t("No PNG, JPEG or WebP pictures found."));
      return;
    }
    const next = [...myStamps, ...stamps];
    try {
      await set("ydming-stamps", next);
    } catch {
      notify(
        "Stamp storage is unavailable. The project still includes these images.",
      );
    }
    try {
      const known: Credit[] =
        (await getWithLegacy<Credit[]>("ydming-library-credits")) || [];
      await set("ydming-library-credits", [...known, credit]);
    } catch {}
    setMyStamps(next);
    const project = projectRef.current;
    if (project)
      commit(
        { ...project, credits: [...project.credits, credit] },
        "Import pack",
      );
    setLibraryTab("My stamps");
    setPanel("library");
    notify(`${stamps.length} ${t("stamps imported")}`);
  }
  return { packInput, importPack };
}
