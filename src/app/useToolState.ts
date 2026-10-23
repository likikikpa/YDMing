import { useRef, useState } from "react";
import type { BrushSettings } from "../editor/types";
import { DEFAULT_SCATTER } from "../scatter-brush";
import type { Tool } from "../types";
import type { Panel } from "./constants";

/** The chosen tool, its brush settings and the colours. */
export function useToolState({
  setPanel,
}: {
  setPanel: (panel: Panel) => void;
}) {
  const [tool, setTool] = useState<Tool>("select");
  const [brush, setBrush] = useState<BrushSettings>({
    size: 48,
    strength: 55,
    opacity: 100,
    hardness: 85,
    color: "#344a39",
    biome: 6,
    material: "sand",
    stamp: "tree",
    sprite: { src: "/assets/cartography/treePine.png", name: "Pine tree" },
    scatter: DEFAULT_SCATTER,
    snap: false,
    pressure: true,
    layer: "Objects",
  });
  // Each tool keeps its own size, strength and opacity between switches.
  const toolBrushes = useRef<
    Partial<
      Record<
        Tool,
        Pick<BrushSettings, "size" | "strength" | "opacity" | "hardness">
      >
    >
  >({});
  const [secondary, setSecondary] = useState("#eee6ce");
  const [recentColors, setRecentColors] = useState<string[]>([]);
  function chooseTool(next: Tool) {
    const { size, strength, opacity, hardness } = brush;
    toolBrushes.current[tool] = { size, strength, opacity, hardness };
    const saved = toolBrushes.current[next];
    if (saved) setBrush((b) => ({ ...b, ...saved }));
    setTool(next);
    if (
      [
        "brush",
        "pencil",
        "eraser",
        "fill",
        "line",
        "rectangle",
        "ellipse",
      ].includes(next)
    )
      setBrush((b) =>
        b.mask && ["brush", "eraser"].includes(next)
          ? b
          : { ...b, layer: "Paint", mask: false },
      );
    else setBrush((b) => ({ ...b, mask: false }));
    if (next === "stamp") {
      setPanel("library");
      setBrush((b) => ({ ...b, layer: "Objects", mask: false }));
    }
  }
  function color(value: string) {
    setBrush((b) => ({ ...b, color: value }));
    setRecentColors((prev) =>
      [value, ...prev.filter((c) => c !== value)].slice(0, 8),
    );
  }
  return {
    tool,
    setTool,
    brush,
    setBrush,
    secondary,
    setSecondary,
    recentColors,
    chooseTool,
    color,
  };
}
