import { uid } from "../types";
import type { GeneratorSettings, MapData, MapKind } from "../types";

/** Runs the generator in a worker so the page stays responsive. */
export function generateAsync(
  kind: MapKind,
  settings: GeneratorSettings,
  name?: string,
  id?: string,
  map?: MapData,
  group?: string,
): Promise<MapData> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../generator.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.onmessage = (e) => {
      worker.terminate();
      e.data.error ? reject(new Error(e.data.error)) : resolve(e.data.result);
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(e.message));
    };
    worker.postMessage({
      requestId: uid(),
      kind,
      settings,
      name,
      id,
      map,
      group,
    });
  });
}
