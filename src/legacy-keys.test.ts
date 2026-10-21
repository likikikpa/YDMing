import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, unknown>();
vi.mock("idb-keyval", () => ({
  get: async (key: string) => store.get(key),
  set: async (key: string, value: unknown) => void store.set(key, value),
}));

import { getWithLegacy, oldName, readSetting } from "./legacy-keys";

describe("keys written before the rename", () => {
  beforeEach(() => store.clear());

  it("maps a new key to the old one", () => {
    expect(oldName("ydming-project-v1")).toBe("atlasforge-project-v1");
  });

  it("loads a project saved under the old key", async () => {
    store.set("atlasforge-project-v1", { name: "Old map" });
    expect(await getWithLegacy("ydming-project-v1")).toEqual({
      name: "Old map",
    });
  });

  it("prefers the new key once it exists", async () => {
    store.set("atlasforge-stamps", ["old"]);
    store.set("ydming-stamps", ["new"]);
    expect(await getWithLegacy("ydming-stamps")).toEqual(["new"]);
  });

  it("reads settings from either name", () => {
    const local = new Map([["atlasforge-lang", "ru"]]);
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => local.get(k) ?? null,
    });
    expect(readSetting("ydming-lang")).toBe("ru");
    local.set("ydming-lang", "en");
    expect(readSetting("ydming-lang")).toBe("en");
    vi.unstubAllGlobals();
  });
});
