import type { MutableRefObject } from "react";
import { loadFont, registerFonts } from "../font-loader";
import {
  FONT_LIMIT_ERROR,
  FONT_UNUSABLE_ERROR,
  MAX_FONTS,
  pruneFonts,
  readFontFile,
} from "../fonts";
import type { Project } from "../types";

/** The fonts the user adds to a world (`Project.fonts`). */
export function useFonts({
  project,
  projectRef,
  commit,
  notify,
  t,
}: {
  project: Project | null;
  projectRef: MutableRefObject<Project | null>;
  commit: (project: Project, label: string) => void;
  notify: (message: string) => void;
  t: (text: string) => string;
}) {
  registerFonts(project?.fonts);
  /** Adds a font file to the world; resolves to its id, or nothing after saying why not. */
  async function importFont(file: File): Promise<string | undefined> {
    try {
      const { id, font } = await readFontFile(file),
        p = projectRef.current;
      if (!p) return undefined;
      // Fonts no map uses make room for the new one.
      const base = pruneFonts(p),
        fonts = { ...base.fonts };
      if (!fonts[id] && Object.keys(fonts).length >= MAX_FONTS)
        throw new Error(FONT_LIMIT_ERROR);
      fonts[id] = font;
      registerFonts(fonts);
      try {
        await loadFont(id);
      } catch {
        registerFonts(p.fonts);
        throw new Error(FONT_UNUSABLE_ERROR);
      }
      commit({ ...base, fonts }, "Add font");
      return id;
    } catch (e) {
      notify(t(e instanceof Error ? e.message : FONT_UNUSABLE_ERROR));
      return undefined;
    }
  }
  return { fonts: project?.fonts, importFont };
}
