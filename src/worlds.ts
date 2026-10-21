import { del, get, set, update } from "idb-keyval";
import { createEmptyMap } from "./generator";
import { loadProject, packProject, unpackProject } from "./storage";
import { defaultSettings, uid } from "./types";
import type { Project } from "./types";

/**
 * A world is a `Project`: every map of one campaign setting. Each world is
 * stored under its own key, and a small index lists them for the picker
 * without loading every map.
 */
export interface WorldEntry {
  id: string;
  name: string;
  maps: number;
  updatedAt: string;
}

const INDEX = "ydming-worlds-v1";
const ACTIVE = "ydming-active-world";
const worldKey = (id: string) => `ydming-world-${id}`;

export const entryOf = (p: Project): WorldEntry => ({
  id: p.id,
  name: p.name,
  maps: p.maps.length,
  updatedAt: p.updatedAt,
});

/** The list with `entry` added or replaced, most recently changed first. */
export function withEntry(list: WorldEntry[], entry: WorldEntry) {
  return [entry, ...list.filter((w) => w.id !== entry.id)].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

/** A world from a file gets a new id when that id is taken, so importing never overwrites a saved world. */
export const asNewWorld = (p: Project, taken: string[]): Project =>
  taken.includes(p.id) ? { ...p, id: uid() } : p;

export function newWorld(name: string): Project {
  const map = createEmptyMap("world", defaultSettings);
  return {
    version: 1,
    id: uid(),
    name,
    maps: [map],
    activeMapId: map.id,
    credits: [],
    commercial: false,
    updatedAt: new Date().toISOString(),
  };
}

/** Every saved world. The first call moves the single project saved before worlds existed into the list. */
export async function listWorlds(): Promise<WorldEntry[]> {
  const list = await get<WorldEntry[]>(INDEX);
  if (list) return list;
  const old = await loadProject();
  if (!old) return [];
  await set(worldKey(old.id), packProject(old));
  const entries = [entryOf(old)];
  await set(INDEX, entries);
  return entries;
}

export async function loadWorld(id: string): Promise<Project | undefined> {
  const p = await get<Project>(worldKey(id));
  return p && unpackProject(p);
}

export async function saveWorld(p: Project) {
  await set(worldKey(p.id), packProject(p));
  await update<WorldEntry[]>(INDEX, (list) =>
    withEntry(list || [], entryOf(p)),
  );
}

export async function removeWorld(id: string) {
  await update<WorldEntry[]>(INDEX, (list) =>
    (list || []).filter((w) => w.id !== id),
  );
  await del(worldKey(id));
}

export const saveActiveWorldId = (id: string) => set(ACTIVE, id);

/** The world open last time, else the most recent one, else a new first world. */
export async function loadStartWorld(): Promise<Project> {
  const list = await listWorlds();
  const ids = [await get<string>(ACTIVE), ...list.map((w) => w.id)];
  for (const id of ids) {
    const p = id && (await loadWorld(id));
    if (p) return p;
  }
  return newWorld("The Eldermere Reach");
}
