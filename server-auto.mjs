// The default ("Auto") image search: the sprite index first, then the web
// sources, put together by what the query asks for.
import {
  searchCommons,
  searchOpenGameArt,
  searchOpenverse,
} from "./server-sources.mjs";
import { classifyQuery, searchIndex } from "./server-sprites.mjs";

const NO_ANSWER = "The image sources did not answer. Try again in a minute.";

/**
 * Collects what the sources answer, without waiting on a slow one. It stops
 * when every source is done, when `wait` ms have passed, or `grace` ms after
 * an answer once there is something to show (`enough`), so one source that
 * hangs does not delay every search. Returns name -> results, or null for a
 * source that failed; a source still out is missing.
 */
function gather(tasks, { wait, grace, enough }) {
  return new Promise((resolve) => {
    const done = new Map();
    let finished = false,
      soft;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(hard);
      clearTimeout(soft);
      resolve(done);
    };
    const hard = setTimeout(finish, wait);
    const settle = (name, results) => {
      if (finished) return;
      done.set(name, results);
      if (done.size === tasks.length) return finish();
      if (enough([...done.values()].flatMap((r) => r ?? []))) {
        clearTimeout(soft);
        soft = setTimeout(finish, grace);
      }
    };
    if (!tasks.length) return finish();
    // A late answer or failure lands here after the search has finished: ignored.
    for (const [name, run] of tasks)
      run.then(
        (results) => settle(name, results),
        () => settle(name, null),
      );
  });
}

/**
 * OpenGameArt needs every word in one entry, so a phrase like "sea port"
 * finds nothing; when the phrase finds little, its longest words are asked
 * for on their own.
 */
async function searchSprites(ask, text) {
  const full = await searchOpenGameArt({ ...ask, q: text });
  const words = [
    ...new Set(
      text
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2),
    ),
  ].sort((a, b) => b.length - a.length);
  if (full.length >= 6 || words.length < 2) return full;
  const parts = await Promise.allSettled(
    words.slice(0, 2).map((w) => searchOpenGameArt({ ...ask, q: w })),
  );
  return [
    ...full,
    ...parts.flatMap((p) => (p.status === "fulfilled" ? p.value : [])),
  ];
}

/**
 * The default search. A sprite query shows the index first, then OpenGameArt
 * and Openverse drawings; a picture query shows Wikimedia and Openverse
 * pictures first, then a few sprites. Returns `{ results, unavailable }`:
 * `unavailable` names the sources that failed or were left out for being
 * slow. It throws only when no source answered and nothing is local.
 */
export async function searchAuto({
  index,
  fetchImpl,
  userAgent,
  q,
  style,
  wait = 6000,
  grace = 1000,
}) {
  const { mode, terms, text } = classifyQuery(q);
  const local = searchIndex(index, terms, {
    style,
    limit: mode === "sprite" ? 30 : 8,
  });
  const ask = { fetchImpl, userAgent, mode };
  const tasks =
    mode === "sprite"
      ? [
          ["OpenGameArt", searchSprites(ask, text)],
          ["Openverse", searchOpenverse({ ...ask, q: text })],
        ]
      : [
          ["Wikimedia", searchCommons({ ...ask, q: text })],
          ["Openverse", searchOpenverse({ ...ask, q: text })],
        ];
  const done = await gather(tasks, {
    wait,
    grace,
    enough: (found) => local.length + found.length > 0,
  });
  const unavailable = tasks
    .map(([name]) => name)
    .filter((name) => !done.get(name));
  // `done.get(name)` is an empty list for a source that answered with nothing.
  const remote = tasks.flatMap(([name]) => done.get(name) ?? []);
  const found =
    mode === "sprite" ? [...local, ...remote] : [...remote, ...local];
  if (!found.length && unavailable.length === tasks.length)
    throw new Error(NO_ANSWER);
  const seen = new Set();
  return {
    results: found.filter((r) => !seen.has(r.image) && seen.add(r.image)),
    unavailable,
  };
}
