import { expect, it } from "vitest";
import { validateProject } from "./storage";
import { generateMap } from "./generator";
import { defaultSettings } from "./types";
import type { Project } from "./types";
it("round-trips project geometry, linked maps, layer masks, and embedded images through a portable file", () => {
  const world = generateMap("world", defaultSettings),
    city = generateMap("city", { ...defaultSettings, seed: "LINKED" });
  world.objects[0].linkedMap = city.id;
  city.parentId = world.id;
  world.layers[0].mask = [
    {
      id: "mask",
      points: [{ x: 10, y: 20 }],
      tool: "brush",
      color: "#ffffff",
      size: 20,
      opacity: 1,
      hardness: 1,
      layer: "Terrain",
    },
  ];
  world.objects.push({
    id: "asset",
    kind: "image",
    name: "Asset",
    x: 5,
    y: 5,
    width: 10,
    height: 10,
    rotation: 0,
    layer: "Objects",
    color: "#000000",
    image: "data:image/png;base64,iVBORw0KGgo=",
  });
  const project: Project = {
    version: 1,
    id: "project",
    name: "World",
    maps: [world, city],
    activeMapId: city.id,
    credits: [],
    commercial: false,
    updatedAt: "2026-10-18",
  };
  expect(validateProject(JSON.parse(JSON.stringify(project)))).toEqual(project);
});
it("rejects malformed geometry and external image references in imported projects", () => {
  const map = generateMap("dungeon", defaultSettings);
  const project = {
    version: 1,
    id: "x",
    name: "Invalid",
    maps: [map],
    activeMapId: map.id,
    credits: [],
    commercial: false,
    updatedAt: "",
  };
  expect(() =>
    validateProject({ ...project, maps: [{ ...map, heights: [] }] }),
  ).toThrow("invalid map data");
  expect(() =>
    validateProject({
      ...project,
      maps: [
        { ...map, objects: [{ image: "https://example.com/private.png" }] },
      ],
    }),
  ).toThrow("embedded");
});
it("keeps bundled sprites from every pack as paths and rejects other paths", () => {
  const map = generateMap("dungeon", defaultSettings);
  const withImage = (image: string) =>
    JSON.parse(
      JSON.stringify({
        version: 1,
        id: "p",
        name: "P",
        maps: [
          {
            ...map,
            objects: [
              {
                id: "s",
                kind: "image",
                name: "S",
                x: 1,
                y: 1,
                width: 10,
                height: 10,
                rotation: 0,
                layer: "Objects",
                color: "#000000",
                image,
              },
            ],
          },
        ],
        activeMapId: map.id,
        credits: [],
        commercial: false,
        updatedAt: "2026-10-21",
      }),
    );
  for (const ok of [
    "/assets/cartography/house.png",
    "/assets/medieval/castle.png",
    "/assets/gosbell/table-long.png",
    "/assets/ai-gen/tree-oak.webp",
  ])
    expect(() => validateProject(withImage(ok))).not.toThrow();
  for (const bad of [
    "/assets/unknown/house.png",
    "/assets/gosbell/../../secret.png",
    "https://example.com/a.png",
    "/assets/ai-gen/tree-oak.svg",
  ])
    expect(() => validateProject(withImage(bad))).toThrow();
});
it("loads a map with tens of thousands of stamps from a file", () => {
  const map = generateMap("world", defaultSettings);
  map.objects = Array.from({ length: 40000 }, (_, i) => ({
    id: `s${i}`,
    kind: "image" as const,
    name: "Oak tree",
    image: "/assets/ai-gen/tree-oak.webp",
    x: i % 500,
    y: Math.floor(i / 500),
    width: 20,
    height: 20,
    rotation: 0,
    layer: "Objects",
    color: "#000000",
  }));
  const project: Project = {
    version: 1,
    id: "big",
    name: "Big",
    maps: [map],
    activeMapId: map.id,
    credits: [],
    commercial: false,
    updatedAt: "",
  };
  expect(
    validateProject(JSON.parse(JSON.stringify(project))).maps[0].objects,
  ).toHaveLength(40000);
});
it("rejects a stamp tint outside -1 to 1", () => {
  const map = generateMap("world", defaultSettings),
    stamp = {
      id: "s",
      kind: "image" as const,
      name: "Oak tree",
      image: "/assets/ai-gen/tree-oak.webp",
      x: 1,
      y: 1,
      width: 20,
      height: 20,
      rotation: 0,
      layer: "Objects",
      color: "#000000",
    };
  const withTint = (tint: unknown) => ({
    version: 1,
    id: "p",
    name: "P",
    maps: [{ ...map, objects: [{ ...stamp, tint }] }],
    activeMapId: map.id,
    credits: [],
    commercial: false,
    updatedAt: "",
  });
  expect(validateProject(withTint(0.4)).maps[0].objects[0].tint).toBe(0.4);
  expect(() => validateProject(withTint(2))).toThrow("tint");
  expect(() => validateProject(withTint("dark"))).toThrow("tint");
});
it("checks the scatter mixes of an imported project", () => {
  const map = generateMap("world", defaultSettings),
    mix = {
      id: "m1",
      name: "Wild edge",
      items: [{ src: "/assets/ai-gen/tree-oak.webp", weight: 3 }],
    };
  const withMixes = (scatterMixes: unknown) => ({
    version: 1,
    id: "p",
    name: "P",
    maps: [map],
    activeMapId: map.id,
    credits: [],
    scatterMixes,
    commercial: false,
    updatedAt: "",
  });
  expect(validateProject(withMixes([mix])).scatterMixes).toEqual([mix]);
  expect(
    validateProject({ ...withMixes([]), scatterMixes: undefined }),
  ).toBeTruthy();
  for (const bad of [
    "mix",
    [{ ...mix, items: [{ src: "https://x.test/a.png", weight: 1 }] }],
    [{ ...mix, name: "" }],
    [mix, mix],
  ])
    expect(() => validateProject(withMixes(bad))).toThrow("scatter mix");
});
