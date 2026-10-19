import { generateMap, rerollGroup } from "./generator";
self.onmessage = (event) => {
  const { requestId, kind, settings, name, id, map, group, size } = event.data;
  try {
    const result =
      map && group
        ? rerollGroup(map, group, settings)
        : generateMap(kind, settings, name, id, size);
    self.postMessage({ requestId, result });
  } catch (error) {
    self.postMessage({ requestId, error: String(error) });
  }
};
