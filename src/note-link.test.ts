import { describe, expect, it } from "vitest";
import { createEmptyMap } from "./generator";
import { isNoteUrl, noteName } from "./note-link";
import { validateProject } from "./storage";
import { defaultSettings } from "./types";

describe("note links", () => {
  it("accepts Obsidian and web links", () => {
    expect(isNoteUrl("obsidian://open?vault=Campaign&file=NPCs%2FBob")).toBe(
      true,
    );
    expect(isNoteUrl("https://example.com/notes/bob")).toBe(true);
  });

  it("rejects script links, plain paths and broken values", () => {
    expect(isNoteUrl("javascript:alert(1)")).toBe(false);
    expect(isNoteUrl("NPCs/Bob.md")).toBe(false);
    expect(isNoteUrl("obsidian://open?file=a b")).toBe(false);
    expect(isNoteUrl(42)).toBe(false);
    expect(isNoteUrl("https://x.com/" + "a".repeat(3000))).toBe(false);
  });

  it("names the note after its file", () => {
    expect(
      noteName("obsidian://open?vault=Campaign&file=Places%2FThe%20Goat.md"),
    ).toBe("The Goat");
    expect(noteName("obsidian://open?vault=Campaign")).toBe("Obsidian");
    expect(noteName("https://example.com/x")).toBe("example.com");
  });
});

describe("note links in imported worlds", () => {
  const world = () => {
    const map = createEmptyMap("world", defaultSettings);
    map.objects.push({
      id: "s",
      kind: "tavern",
      name: "Goat",
      x: 1,
      y: 1,
      width: 9,
      height: 9,
      rotation: 0,
      layer: "Objects",
      color: "#000000",
    });
    return {
      version: 1 as const,
      id: "w",
      name: "W",
      maps: [map],
      activeMapId: map.id,
      credits: [],
      commercial: false,
      updatedAt: "",
    };
  };

  it("keeps valid links on maps and stamps", () => {
    const w = world();
    w.maps[0].noteUrl = "obsidian://open?vault=C&file=World";
    w.maps[0].objects[0].noteUrl = "obsidian://open?vault=C&file=Goat";
    expect(validateProject(JSON.parse(JSON.stringify(w)))).toEqual(w);
  });

  it("rejects a file with a script link", () => {
    const w = world();
    w.maps[0].objects[0].noteUrl = "javascript:alert(1)";
    expect(() => validateProject(w)).toThrow(/Note links/);
    const m = world();
    m.maps[0].noteUrl = "javascript:alert(1)";
    expect(() => validateProject(m)).toThrow(/Note links/);
  });
});
