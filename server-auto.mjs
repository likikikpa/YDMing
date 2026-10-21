// The default ("Auto") image search: the sprite index first, then the web
// sources, put together by what the query asks for.
import {
  searchCommons,
  searchOpenGameArt,
  searchOpenverse,
} from "./server-sources.mjs";
import { classifyQuery, searchIndex } from "./server-sprites.mjs";

/**
 * The default search. A sprite query shows the index first, then OpenGameArt
 * and Openverse drawings; a picture query shows Wikimedia and Openverse
 * pictures first, then a few sprites. A source that fails is skipped as long
 * as another one has results.
 */
export async function searchAuto({
  index,
  fetchImpl,
  userAgent,
  q,
  style,
  wait = 6000,
}) {
  const { mode, terms, text } = classifyQuery(q);
  const local = searchIndex(index, terms, {
    style,
    limit: mode === "sprite" ? 30 : 8,
  });
  const ask = { fetchImpl, userAgent, mode };
  // A slow source must not hold up the others: past `wait` it counts as failed.
  const within = (search, name) => {
    let timer;
    const late = new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`${name} did not answer in time.`)),
        wait,
      );
    });
    return Promise.race([search, late]).finally(() => clearTimeout(timer));
  };
  const settled = await Promise.allSettled(
    mode === "sprite"
      ? [
          within(searchOpenGameArt({ ...ask, q: text }), "OpenGameArt"),
          within(searchOpenverse({ ...ask, q: text }), "Openverse"),
        ]
      : [
          within(searchCommons({ ...ask, q: text }), "Wikimedia"),
          within(searchOpenverse({ ...ask, q: text }), "Openverse"),
        ],
  );
  const remote = settled.flatMap((s) =>
    s.status === "fulfilled" ? s.value : [],
  );
  const results =
    mode === "sprite" ? [...local, ...remote] : [...remote, ...local];
  if (!results.length) {
    const failed = settled.find((s) => s.status === "rejected");
    if (failed) throw failed.reason;
  }
  const seen = new Set();
  return results.filter((r) => !seen.has(r.image) && seen.add(r.image));
}
