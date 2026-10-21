import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, unknown>();
vi.mock("idb-keyval", () => ({
  get: async (key: string) => store.get(key),
  set: async (key: string, value: unknown) => void store.set(key, value),
  del: async (key: string) => void store.delete(key),
  update: async (key: string, fn: (v: unknown) => unknown) =>
    void store.set(key, fn(store.get(key))),
}));

import {
  asNewWorld,
  listWorlds,
  loadStartWorld,
  loadWorld,
  newWorld,
  removeWorld,
  saveActiveWorldId,
  saveWorld,
  withEntry,
} from "./worlds";

describe("worlds", () => {
  beforeEach(() => store.clear());

  it("moves the project saved before worlds existed into the list", async () => {
    const old = newWorld("Old campaign");
    store.set("atlasforge-project-v1", old);
    expect(await listWorlds()).toEqual([
      { id: old.id, name: "Old campaign", maps: 1, updatedAt: old.updatedAt },
    ]);
    expect((await loadWorld(old.id))?.name).toBe("Old campaign");
    // The old save stays where it was.
    expect(store.has("atlasforge-project-v1")).toBe(true);
  });

  it("does not bring a deleted old project back", async () => {
    const old = newWorld("Old campaign");
    store.set("ydming-project-v1", old);
    await listWorlds();
    await removeWorld(old.id);
    expect(await listWorlds()).toEqual([]);
  });

  it("saves several worlds and opens the last active one", async () => {
    const a = { ...newWorld("A"), updatedAt: "2026-01-01" };
    const b = { ...newWorld("B"), updatedAt: "2026-02-01" };
    await saveWorld(a);
    await saveWorld(b);
    expect((await listWorlds()).map((w) => w.name)).toEqual(["B", "A"]);
    await saveActiveWorldId(a.id);
    expect((await loadStartWorld()).id).toBe(a.id);
    await removeWorld(a.id);
    expect((await loadStartWorld()).id).toBe(b.id);
  });

  it("keeps map grids as plain arrays after a round trip", async () => {
    const w = newWorld("Grids");
    await saveWorld(w);
    const back = await loadWorld(w.id);
    expect(Array.isArray(back!.maps[0].heights)).toBe(true);
    expect(back!.maps[0].heights).toEqual(w.maps[0].heights);
  });

  it("gives an imported world a new id only when its id is taken", () => {
    const w = newWorld("File");
    expect(asNewWorld(w, []).id).toBe(w.id);
    expect(asNewWorld(w, [w.id]).id).not.toBe(w.id);
  });

  it("replaces an entry and keeps the newest first", () => {
    const list = withEntry(
      [{ id: "a", name: "A", maps: 1, updatedAt: "2026-03-01" }],
      { id: "b", name: "B", maps: 2, updatedAt: "2026-01-01" },
    );
    expect(
      withEntry(list, {
        id: "b",
        name: "B2",
        maps: 3,
        updatedAt: "2026-04-01",
      }),
    ).toEqual([
      { id: "b", name: "B2", maps: 3, updatedAt: "2026-04-01" },
      { id: "a", name: "A", maps: 1, updatedAt: "2026-03-01" },
    ]);
  });
});
