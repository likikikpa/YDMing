import { get } from "idb-keyval";

/**
 * The app was called "atlasforge" before it became YDMing. Saves, library items and
 * settings written under the old names must keep loading, so reads fall back to them
 * and writes only use the new names.
 */
const OLD = "atlasforge";
const NEW = "ydming";

export const oldName = (key: string) => key.replace(NEW, OLD);

/** IndexedDB read: the new key, or the old key when the new one was never written. */
export async function getWithLegacy<T>(key: string): Promise<T | undefined> {
  const value = await get<T>(key);
  return value !== undefined ? value : get<T>(oldName(key));
}

/** localStorage read with the same fallback. */
export function readSetting(key: string): string | null {
  return localStorage.getItem(key) ?? localStorage.getItem(oldName(key));
}
