import { describe, expect, it } from "vitest";
import { generateMap } from "./generator";
import { packProject, validateProject } from "./storage";
import { defaultSettings } from "./types";
import { newWorld } from "./worlds";
import type { Project } from "./types";

const FONT = { name: "Kurale", data: "data:font/woff2;base64,d09GMgABAAAA" };

function project(): Project {
  const p = newWorld("fonts"),
    map = generateMap("world", { ...defaultSettings, seed: "fs1", detail: 0 });
  map.objects.push({
    id: "l1",
    kind: "label",
    x: 10,
    y: 10,
    name: "Новгород",
    width: 120,
    height: 18,
    rotation: 0,
    layer: "Labels",
    color: "#222222",
    font: "fkurale",
  });
  map.settings.labelFont = "cinzel";
  p.maps = [map];
  p.activeMapId = map.id;
  p.fonts = { fkurale: FONT };
  return p;
}

describe("a project with fonts", () => {
  it("round-trips through a portable file with its fonts and every font choice", () => {
    const p = project(),
      back = validateProject(JSON.parse(JSON.stringify(p)));
    expect(back.fonts).toEqual(p.fonts);
    expect(back.maps[0].settings.labelFont).toBe("cinzel");
    expect(back.maps[0].objects.find((o) => o.id === "l1")!.font).toBe(
      "fkurale",
    );
  });

  it("still opens projects saved before fonts existed", () => {
    const p = project();
    delete p.fonts;
    for (const o of p.maps[0].objects) delete o.font;
    delete p.maps[0].settings.labelFont;
    expect(() => validateProject(JSON.parse(JSON.stringify(p)))).not.toThrow();
  });

  it("opens a label whose font is not in the world: it is drawn in the default", () => {
    const p = project();
    delete p.fonts;
    expect(() => validateProject(JSON.parse(JSON.stringify(p)))).not.toThrow();
  });

  it("refuses a font table that is not made of fonts", () => {
    for (const fonts of [
      { fkurale: { name: "x", data: "data:text/html;base64,PHNjcmlwdD4=" } },
      { fkurale: { name: "x", data: "javascript:alert(1)" } },
      [FONT],
      "fonts",
    ])
      expect(() =>
        validateProject({ ...JSON.parse(JSON.stringify(project())), fonts }),
      ).toThrow(/invalid font/);
  });

  it("refuses a font name that could be used to inject CSS", () => {
    const p = JSON.parse(JSON.stringify(project()));
    p.maps[0].objects.find((o: { id: string }) => o.id === "l1").font =
      'x"; } body { display:none';
    expect(() => validateProject(p)).toThrow(/invalid font name/);
    const q = JSON.parse(JSON.stringify(project()));
    q.maps[0].settings.labelFont = 'a b"';
    expect(() => validateProject(q)).toThrow(/invalid font name/);
  });

  it("drops fonts no map uses when it is saved, and keeps the ones in use", () => {
    const p = project();
    p.fonts!.funused = FONT;
    const saved = packProject(p);
    expect(Object.keys(saved.fonts!)).toEqual(["fkurale"]);
  });
});
