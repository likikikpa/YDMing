import type { AssetResult } from "./types";

/** Why an image search did not return results, in words the person can act on. */
export type SearchProblem = "no-server" | "offline" | "message";

export type SearchReply =
  /** `unavailable` names sources that did not answer, so the list may be short. */
  | { results: AssetResult[]; unavailable?: string[] }
  | { problem: SearchProblem; message?: string };

/**
 * Reads the reply of the local server's `/api/search`. That server always
 * answers in JSON, so anything else (a plain "not found" page from a static
 * host, a proxy's error page) means the page runs without the YDMing
 * server, and saying so beats a JSON parse error.
 */
export function readSearchReply(ok: boolean, body: string): SearchReply {
  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    return { problem: "no-server" };
  }
  const reply = data as {
    results?: unknown;
    unavailable?: unknown;
    error?: unknown;
  };
  if (ok && Array.isArray(reply?.results)) {
    const unavailable = Array.isArray(reply.unavailable)
      ? reply.unavailable.filter((s) => typeof s === "string")
      : [];
    return {
      results: reply.results as AssetResult[],
      ...(unavailable.length && { unavailable }),
    };
  }
  if (typeof reply?.error === "string" && reply.error)
    return { problem: "message", message: reply.error };
  return { problem: "no-server" };
}

/** Where the browser loads a result's image: sprites that ship with the app directly, others through the server. */
export const assetUrl = (url: string) =>
  url.startsWith("/assets/")
    ? url
    : `/api/image?${new URLSearchParams({ url })}`;

/** Runs a search; a request that never reaches any server means no connection. */
export async function searchImages(url: string): Promise<SearchReply> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    return { problem: "offline" };
  }
  return readSearchReply(response.ok, await response.text());
}
