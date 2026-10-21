import type { Clip } from "./clipboard";
import { uid } from "./types";
import type { MapData, MapKind, MapObject, MapPath, StampKind } from "./types";

/** A group of stamps and paths that can be placed on a map in one click. */
export interface Scene {
  id: string;
  name: string;
  clip: Clip;
}

/** kind, x, y, width, height (from the scene's middle), and a name if it has one. */
type Part = [StampKind, number, number, number, number, string?];
/** A road or wall: its width and the points it passes through. */
type Line = ["road" | "wall", number, [number, number][]];
interface Design {
  id: string;
  name: string;
  /** The kinds of map the scene suits. */
  maps: MapKind[];
  parts: Part[];
  lines?: Line[];
}

const TREE: [number, number] = [22, 29];
const tree = (x: number, y: number, pine = false): Part => [
  pine ? "pine" : "tree",
  x,
  y,
  ...TREE,
];

// Overland designs are in map pixels, dungeon ones in dungeon cells.
const DESIGNS: Design[] = [
  {
    id: "hamlet",
    name: "Hamlet",
    maps: ["world", "city"],
    parts: [
      ["house", -34, -18, 26, 26],
      ["house", 30, -24, 26, 26],
      ["house", -28, 26, 26, 26],
      ["house", 36, 22, 26, 26],
      ["well", 0, 2, 18, 18],
      tree(-6, -44),
      tree(56, -2),
      tree(-60, 6),
    ],
  },
  {
    id: "crossroads-inn",
    name: "Crossroads inn",
    maps: ["world", "city"],
    parts: [
      ["tavern", 0, -16, 32, 32, "The Crossroads Inn"],
      ["house", -44, 18, 24, 24],
      ["well", 34, 24, 18, 18],
    ],
    lines: [
      [
        "road",
        2,
        [
          [-80, 6],
          [-30, 10],
          [0, 8],
          [40, 6],
          [80, 4],
        ],
      ],
      [
        "road",
        2,
        [
          [0, -70],
          [2, -30],
          [0, 8],
          [-2, 40],
          [0, 80],
        ],
      ],
    ],
  },
  {
    id: "farmstead",
    name: "Farmstead",
    maps: ["world", "city"],
    parts: [
      ["house", 0, -4, 30, 30, "Farmhouse"],
      ["house", -38, 14, 22, 22],
      ["house", 36, 18, 22, 22],
      tree(-62, -20),
      tree(60, -22),
      tree(-52, 44),
      tree(50, 46),
    ],
  },
  {
    id: "forest-grove",
    name: "Forest grove",
    maps: ["world", "city"],
    parts: [
      tree(-30, -26),
      tree(-4, -34),
      tree(24, -24),
      tree(46, -4, true),
      tree(-48, 0, true),
      tree(-20, -2),
      tree(10, -6),
      tree(32, 20),
      tree(-34, 26, true),
      tree(-6, 28),
      tree(14, 40, true),
    ],
  },
  {
    id: "pine-wood",
    name: "Pine wood",
    maps: ["world", "city"],
    parts: [
      tree(-36, -20, true),
      tree(-10, -30, true),
      tree(18, -22, true),
      tree(44, -10, true),
      tree(-48, 8, true),
      tree(-18, 4, true),
      tree(10, 10, true),
      tree(36, 24, true),
      tree(-30, 34, true),
      tree(0, 42, true),
    ],
  },
  {
    id: "watchtower",
    name: "Watchtower",
    maps: ["world", "city"],
    parts: [
      ["tower", 0, 0, 28, 28, "Watchtower"],
      tree(-34, 12, true),
      tree(30, -14, true),
      tree(36, 26, true),
    ],
    lines: [
      [
        "wall",
        3,
        [
          [-50, 40],
          [0, 44],
          [50, 40],
        ],
      ],
    ],
  },
  {
    id: "ruined-keep",
    name: "Ruined keep",
    maps: ["world", "city"],
    parts: [
      ["castle", 0, 0, 34, 34, "Ruined keep"],
      ["rock", -36, 16, 16, 16],
      ["rock", 30, 22, 14, 14],
      ["rock", -20, -30, 12, 12],
      tree(44, -14),
      tree(-50, -4),
    ],
  },
  {
    id: "pillared-hall",
    name: "Pillared hall",
    maps: ["dungeon"],
    parts: [-3, -1, 1, 3].flatMap((x) =>
      [-1.5, 1.5].map((y): Part => ["pillar", x, y, 0.7, 0.7]),
    ),
  },
  {
    id: "treasure-vault",
    name: "Treasure vault",
    maps: ["dungeon"],
    parts: [
      ["chest", -1.2, 0, 0.7, 0.5, "Treasure"],
      ["chest", 0, 0, 0.7, 0.5, "Treasure"],
      ["chest", 1.2, 0, 0.7, 0.5, "Treasure"],
      ["trap", 0, 1.4, 0.6, 0.6, "Pressure plate"],
    ],
  },
  {
    id: "shrine",
    name: "Shrine",
    maps: ["dungeon"],
    parts: [
      ["well", 0, 0, 1.2, 1.2, "Font"],
      ["pillar", -2, -2, 0.7, 0.7],
      ["pillar", 2, -2, 0.7, 0.7],
      ["pillar", -2, 2, 0.7, 0.7],
      ["pillar", 2, 2, 0.7, 0.7],
      ["chest", 0, -2.4, 0.7, 0.5, "Offering"],
    ],
  },
  {
    id: "entrance",
    name: "Entrance",
    maps: ["dungeon"],
    parts: [
      ["stairs", 0, -0.6, 1, 1, "Stairs down"],
      ["pillar", -1.8, -0.6, 0.7, 0.7],
      ["pillar", 1.8, -0.6, 0.7, 0.7],
      ["door", 0, 1.1, 0.8, 0.35, "Door"],
    ],
  },
];

const hidden: StampKind[] = ["trap", "secret"];
/** Width of a road or wall relative to a world map; city maps draw them heavier. */
const lineScale = (kind: MapKind) => (kind === "city" ? 3 : 1);

/** The built-in scenes that suit `map`, sized for it. */
export function builtinScenes(map: Pick<MapData, "kind" | "width" | "cols">) {
  const unit = map.kind === "dungeon" ? map.width / map.cols : 1;
  return DESIGNS.filter((d) => d.maps.includes(map.kind)).map(
    (d): Scene => ({
      id: d.id,
      name: d.name,
      clip: {
        objects: d.parts.map(
          ([kind, x, y, w, h, name]): MapObject => ({
            id: uid(),
            kind,
            x: x * unit,
            y: y * unit,
            name: name ?? kind.charAt(0).toUpperCase() + kind.slice(1),
            width: w * unit,
            height: h * unit,
            rotation: 0,
            layer: hidden.includes(kind) ? "GM-only" : "Objects",
            color: "#473e2b",
          }),
        ),
        paths: (d.lines ?? []).map(
          ([kind, width, points]): MapPath => ({
            id: uid(),
            kind,
            width: width * lineScale(map.kind),
            points: points.map(([x, y]) => ({ x: x * unit, y: y * unit })),
            layer: "Objects",
          }),
        ),
        credits: [],
        centre: { x: 0, y: 0 },
      },
    }),
  );
}

/** Whether a stored scene has what placing it needs; anything else is dropped on load. */
export const validScene = (value: unknown): value is Scene => {
  const s = value as Scene | null;
  return (
    !!s &&
    typeof s.id === "string" &&
    typeof s.name === "string" &&
    !!s.clip &&
    Array.isArray(s.clip.objects) &&
    Array.isArray(s.clip.paths) &&
    Array.isArray(s.clip.credits) &&
    Number.isFinite(s.clip.centre?.x) &&
    Number.isFinite(s.clip.centre?.y)
  );
};
