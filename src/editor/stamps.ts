import { spriteSize } from "../stamp-brush";
import { uid } from "../types";
import type { Point } from "../types";
import { editable } from "./draft";
import type { EditorCore } from "./useEditorCore";

export type EditorStamps = ReturnType<typeof createStamps>;

export function createStamps(deps: EditorCore) {
  const { latest, draft } = deps;
  function placeStamp(p: Point) {
    const m = draft.current!,
      b = latest.current.brush;
    if (!editable(m, b.layer)) return;
    if (b.sprite) {
      m.objects.push({
        id: uid(),
        kind: "image",
        image: b.sprite.src,
        x: p.x,
        y: p.y,
        name: b.sprite.name,
        ...spriteSize(b.sprite, b.size),
        rotation: 0,
        layer: b.layer,
        color: b.color,
        ...(b.sprite.credit && { creditId: b.sprite.credit.id }),
      });
      return;
    }
    const tree = ["tree", "pine"].includes(b.stamp);
    m.objects.push({
      id: uid(),
      kind: b.stamp,
      x: p.x,
      y: p.y,
      name:
        b.stamp === "tavern"
          ? ["The Copper Stag", "The Wandering Fox", "The Merry Badger"][
              Math.floor(Math.random() * 3)
            ]
          : b.stamp.charAt(0).toUpperCase() + b.stamp.slice(1),
      width: tree ? b.size * 0.45 : b.size,
      height: tree ? b.size * 0.6 : b.size,
      rotation: 0,
      layer: b.stamp === "trap" || b.stamp === "secret" ? "GM-only" : b.layer,
      color: b.color,
    });
  }
  return { placeStamp };
}
