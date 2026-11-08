import { describe, expect, it } from "vitest";
import {
  BUNDLED_FONTS,
  DEFAULT_STACK,
  FONT_FILE_ERROR,
  MAX_FONTS,
  fontFormat,
  fontNameFromFile,
  isBundledFont,
  pruneFonts,
  readFontFile,
  stackOf,
  usedFontIds,
  validFontId,
  validFonts,
} from "./fonts";
import { generateMap } from "./generator";
import { newWorld } from "./worlds";
import { defaultSettings } from "./types";
import type { Project } from "./types";

const file = (bytes: number[], name = "My_Font.ttf", pad = 64) =>
  Object.assign(
    new Blob([new Uint8Array([...bytes, ...new Array(pad).fill(0)])]),
    {
      name,
    },
  );
const TTF = [0, 1, 0, 0];
const dataFor = (format: string) => `data:font/${format};base64,AAEAAAAA`;

describe("bundled fonts", () => {
  it("lists unique ids that are safe as file and family names", () => {
    expect(new Set(BUNDLED_FONTS.map((f) => f.id)).size).toBe(
      BUNDLED_FONTS.length,
    );
    for (const f of BUNDLED_FONTS) {
      expect(validFontId(f.id)).toBe(true);
      expect(isBundledFont(f.id)).toBe(true);
      expect(f.label.length).toBeGreaterThan(2);
    }
    expect(isBundledFont("nope")).toBe(false);
  });

  it("offers fonts for Russian names first, and says which are Latin only", () => {
    expect(
      BUNDLED_FONTS.filter((f) => f.cyrillic).length,
    ).toBeGreaterThanOrEqual(6);
    expect(BUNDLED_FONTS.some((f) => !f.cyrillic)).toBe(true);
    const firstLatinOnly = BUNDLED_FONTS.findIndex((f) => !f.cyrillic);
    expect(BUNDLED_FONTS.slice(firstLatinOnly).some((f) => f.cyrillic)).toBe(
      false,
    );
  });

  it("has the files the list names, and their licences", async () => {
    const { existsSync, readFileSync } = await import("node:fs");
    for (const f of BUNDLED_FONTS)
      expect(existsSync(`public/fonts/${f.id}.woff2`), f.id).toBe(true);
    const licences = readFileSync("public/fonts/LICENSES.txt", "utf8");
    for (const f of BUNDLED_FONTS) expect(licences, f.label).toContain(f.label);
    expect(licences).toMatch(/SIL OPEN FONT LICENSE Version 1\.1/);
  });
});

describe("font stacks", () => {
  it("puts the font first and the default after it for letters it lacks", () => {
    expect(stackOf("cinzel")).toBe(`"ydm-cinzel", ${DEFAULT_STACK}`);
  });
});

describe("fontFormat", () => {
  it("reads the format from the first bytes, not the name", () => {
    const pad = new Array(12).fill(0);
    expect(fontFormat(new Uint8Array([...TTF, ...pad]))).toBe("ttf");
    expect(fontFormat(new Uint8Array([0x74, 0x72, 0x75, 0x65, ...pad]))).toBe(
      "ttf",
    );
    expect(fontFormat(new Uint8Array([0x4f, 0x54, 0x54, 0x4f, ...pad]))).toBe(
      "otf",
    );
    expect(fontFormat(new Uint8Array([0x77, 0x4f, 0x46, 0x46, ...pad]))).toBe(
      "woff",
    );
    expect(fontFormat(new Uint8Array([0x77, 0x4f, 0x46, 0x32, ...pad]))).toBe(
      "woff2",
    );
  });

  it("refuses collections, pictures, scripts and files too short to be fonts", () => {
    const pad = new Array(12).fill(0);
    expect(
      fontFormat(new Uint8Array([0x74, 0x74, 0x63, 0x66, ...pad])),
    ).toBeUndefined();
    expect(
      fontFormat(new Uint8Array([0x89, 0x50, 0x4e, 0x47, ...pad])),
    ).toBeUndefined();
    expect(
      fontFormat(new TextEncoder().encode("<svg onload=alert(1)>")),
    ).toBeUndefined();
    expect(fontFormat(new Uint8Array([...TTF]))).toBeUndefined();
  });
});

describe("fontNameFromFile", () => {
  it("drops the extension and tidies the name", () => {
    expect(fontNameFromFile("My_Fancy_Font.ttf")).toBe("My Fancy Font");
    expect(fontNameFromFile("a.b.c.otf")).toBe("a.b.c");
    expect(fontNameFromFile(".woff2")).toBe("Font");
    expect(fontNameFromFile("x".repeat(200) + ".ttf")).toHaveLength(80);
  });
});

describe("readFontFile", () => {
  it("makes a table entry named after the file, with an id of its content", async () => {
    const a = await readFontFile(file(TTF));
    expect(a.font.name).toBe("My Font");
    expect(a.font.data).toMatch(/^data:font\/ttf;base64,/);
    expect(validFontId(a.id)).toBe(true);
    expect(a.id.startsWith("f")).toBe(true);
    expect((await readFontFile(file(TTF, "Other.ttf"))).id).toBe(a.id);
    expect((await readFontFile(file([...TTF], "x.ttf", 65))).id).not.toBe(a.id);
  });

  it("refuses what is not a font file, with a message that says what to do", async () => {
    await expect(readFontFile(file([0x89, 0x50, 0x4e, 0x47]))).rejects.toThrow(
      FONT_FILE_ERROR,
    );
    const big = Object.assign(new Blob([new Uint8Array(3_000_001)]), {
      name: "big.ttf",
    });
    await expect(readFontFile(big)).rejects.toThrow(FONT_FILE_ERROR);
  });
});

describe("validFonts", () => {
  it("accepts fonts this app wrote", () => {
    expect(validFonts({ fabc: { name: "A", data: dataFor("woff2") } })).toBe(
      true,
    );
    expect(validFonts({})).toBe(true);
  });

  it("refuses anything else: other types, scripts, bad ids, too many", () => {
    for (const bad of [
      null,
      [],
      "x",
      { "bad id!": { name: "A", data: dataFor("ttf") } },
      { fabc: { name: "", data: dataFor("ttf") } },
      { fabc: { name: "A", data: "data:image/png;base64,AAAA" } },
      { fabc: { name: "A", data: "data:font/ttf;base64,AA</script>" } },
      { fabc: { name: "A", data: "https://example.com/x.ttf" } },
      { fabc: { name: "A".repeat(81), data: dataFor("ttf") } },
      { fabc: { name: "A" } },
    ])
      expect(validFonts(bad), JSON.stringify(bad)).toBe(false);
    const many = Object.fromEntries(
      Array.from({ length: MAX_FONTS + 1 }, (_, i) => [
        `f${i}`,
        { name: "A", data: dataFor("ttf") },
      ]),
    );
    expect(validFonts(many)).toBe(false);
  });
});

describe("pruneFonts", () => {
  const project = (): Project => {
    const p = newWorld("fonts");
    p.maps[0] = generateMap("world", {
      ...defaultSettings,
      seed: "f1",
      detail: 0,
    });
    p.activeMapId = p.maps[0].id;
    p.fonts = {
      fused: { name: "Used", data: dataFor("ttf") },
      fmap: { name: "Map", data: dataFor("ttf") },
      fgone: { name: "Gone", data: dataFor("ttf") },
    };
    return p;
  };

  it("keeps the fonts a label or a map's label font names and drops the rest", () => {
    const p = project();
    p.maps[0].objects.push({
      id: "l1",
      kind: "label",
      x: 1,
      y: 1,
      name: "A",
      width: 50,
      height: 10,
      rotation: 0,
      layer: "Labels",
      color: "#000000",
      font: "fused",
    });
    p.maps[0].settings.labelFont = "fmap";
    expect([...usedFontIds(p)].sort()).toEqual(["fmap", "fused"]);
    expect(Object.keys(pruneFonts(p).fonts!).sort()).toEqual(["fmap", "fused"]);
  });

  it("leaves the project alone when every font is used, and drops the table when none is", () => {
    const p = project();
    p.maps[0].settings.labelFont = "fmap";
    p.fonts = { fmap: p.fonts!.fmap };
    expect(pruneFonts(p)).toBe(p);
    const q = project();
    expect("fonts" in pruneFonts(q)).toBe(false);
    const none = newWorld("x");
    expect(pruneFonts(none)).toBe(none);
  });
});
