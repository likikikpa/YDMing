import { describe, expect, it } from "vitest";
import { shortcutKey } from "./shortcut-key";

describe("shortcutKey", () => {
  it("uses a Latin letter as typed, upper or lower case", () => {
    expect(shortcutKey({ key: "c", code: "KeyC" })).toBe("c");
    expect(shortcutKey({ key: "V", code: "KeyV" })).toBe("v");
  });
  it("finds the key under a Russian layout", () => {
    expect(shortcutKey({ key: "с", code: "KeyC" })).toBe("c");
    expect(shortcutKey({ key: "м", code: "KeyV" })).toBe("v");
    expect(shortcutKey({ key: "я", code: "KeyZ" })).toBe("z");
    expect(shortcutKey({ key: "Я", code: "KeyZ" })).toBe("z");
  });
  it("keeps the letter a Dvorak layout types, not the key's position", () => {
    expect(shortcutKey({ key: "j", code: "KeyC" })).toBe("j");
  });
  it("finds the bracket keys on a Russian layout", () => {
    expect(shortcutKey({ key: "х", code: "BracketLeft" })).toBe("[");
    expect(shortcutKey({ key: "ъ", code: "BracketRight" })).toBe("]");
    expect(shortcutKey({ key: "[", code: "BracketLeft" })).toBe("[");
  });
  it("leaves other keys alone", () => {
    expect(shortcutKey({ key: "Enter", code: "Enter" })).toBe("enter");
    expect(shortcutKey({ key: "1", code: "Digit1" })).toBe("1");
    expect(shortcutKey({ key: "Delete", code: "Delete" })).toBe("delete");
  });
});
