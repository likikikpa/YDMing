import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { createApp } from "../server-app.mjs";
import { createSearchMiddleware } from "../server-api.mjs";
import { searchAuto } from "../server-auto.mjs";
import { loadSpriteIndex, searchIndex } from "../server-sprites.mjs";

const index = loadSpriteIndex();

const ogaPage = (...slugs) =>
  slugs
    .map(
      (s) =>
        `<div class="views-row"><span class="art-preview-title"><a href="/content/${s}">${s}</a></span><img src='https://opengameart.org/sites/default/files/styles/thumbnail/public/${s}.png'></div>`,
    )
    .join("\n");

/** Pretends to be the web: `oga` maps a search phrase to its result page; Openverse never answers. */
function fakeWeb({ oga = {}, openverse = "hang" } = {}) {
  const calls = [];
  const fetchImpl = (url) => {
    url = String(url);
    calls.push(url);
    if (url.startsWith("https://opengameart.org")) {
      const keys = new URL(url).searchParams.get("keys");
      return Promise.resolve(new Response(oga[keys] ?? ogaPage()));
    }
    if (url.startsWith("https://api.openverse.org"))
      return openverse === "hang"
        ? new Promise(() => {})
        : Promise.resolve(
            openverse === "fail"
              ? new Response("", { status: 503 })
              : Response.json({ results: [] }),
          );
    return Promise.resolve(new Response("", { status: 503 }));
  };
  return { fetchImpl, calls };
}

const auto = (q, web, options = {}) =>
  searchAuto({
    index,
    fetchImpl: web.fetchImpl,
    userAgent: "test",
    q,
    wait: 3000,
    grace: 100,
    ...options,
  });

test("a query of several words ranks sprites that match all of them first, then any of them", () => {
  const entry = (id, ...tags) => ({
    look: "ink",
    tags: new Set(tags),
    result: { id },
  });
  const fake = {
    entries: [
      entry("sea-only", "sea", "turtle"),
      entry("both", "sea", "port"),
      entry("port-only", "port"),
      entry("unrelated", "dragon"),
      entry("harbor", "harbor"),
    ],
  };
  const ids = searchIndex(fake, ["sea", "port"]).map((r) => r.id);
  assert.equal(ids[0], "both");
  assert.deepEqual([...ids].sort(), [
    "both",
    "harbor",
    "port-only",
    "sea-only",
  ]);
  assert.ok(!ids.includes("unrelated"));
});

test("the real index answers 'sea port' and 'harbor town' with sprites", () => {
  assert.ok(searchIndex(index, ["sea", "port"]).length >= 5);
  assert.ok(searchIndex(index, ["harbor", "town"]).length >= 5);
});

test("'sea port' gets sprites and per-word OpenGameArt results while Openverse never answers", async () => {
  const web = fakeWeb({
    oga: { port: ogaPage("port-tiles"), sea: ogaPage("sea-tiles") },
  });
  const started = Date.now();
  const { results, unavailable } = await auto("sea port", web);
  assert.ok(Date.now() - started < 2000, "does not wait for Openverse");
  assert.ok(results.length > 5);
  assert.ok(results.some((r) => r.id === "oga:port-tiles"));
  assert.ok(results.some((r) => r.id === "oga:sea-tiles"));
  assert.deepEqual(unavailable, ["Openverse"]);
  const phrases = web.calls
    .filter((u) => u.startsWith("https://opengameart.org"))
    .map((u) => new URL(u).searchParams.get("keys"));
  assert.deepEqual(phrases, ["sea port", "port", "sea"]);
});

test("a source that hangs does not hold up the answer once another has answered", async () => {
  const web = fakeWeb({ oga: { clouds: ogaPage("cloud-set") } });
  const started = Date.now();
  const { results } = await auto("clouds", web, { wait: 5000, grace: 50 });
  assert.ok(Date.now() - started < 1500);
  assert.ok(results.some((r) => r.id === "oga:cloud-set"));
});

test("sources that answer with nothing give an empty result, not an error", async () => {
  const web = fakeWeb({ openverse: "empty" });
  assert.deepEqual(await auto("zzqx", web), { results: [], unavailable: [] });
});

test("when no source answers and nothing is local, the error says what to do", async () => {
  const web = fakeWeb({ openverse: "fail" });
  web.fetchImpl = async () => new Response("", { status: 503 });
  await assert.rejects(auto("zzqx", web), /Try again in a minute/);
});

async function withProxy(t, fetchImpl, now = Date.now) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "ydming auto "));
  await mkdir(path.join(directory, "assets"));
  await writeFile(path.join(directory, "index.html"), "<!doctype html>ok");
  const server = createApp({
    staticDirectory: directory,
    searchMiddleware: createSearchMiddleware({
      fetchImpl,
      spriteIndex: index,
      now,
    }),
  }).listen(0, "127.0.0.1");
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  });
  await once(server, "listening");
  return `http://127.0.0.1:${server.address().port}`;
}

test("the proxy names no source when all fail, and flags answers that miss one", async (t) => {
  const down = await withProxy(
    t,
    async () => new Response("", { status: 503 }),
  );
  const failed = await fetch(down + "/api/search?source=auto&q=zzqx");
  assert.equal(failed.status, 502);
  const { error } = await failed.json();
  assert.match(error, /Try again in a minute/);
  assert.doesNotMatch(error, /Openverse|OpenGameArt/);

  const web = fakeWeb({ oga: { clouds: ogaPage("cloud-set") } });
  const base = await withProxy(t, web.fetchImpl);
  const partial = await (
    await fetch(base + "/api/search?source=auto&q=clouds")
  ).json();
  assert.deepEqual(partial.unavailable, ["Openverse"]);
  assert.ok(partial.results.length > 0);
});

test("an answer that missed a source is kept for minutes, a complete one for a day", async (t) => {
  let time = 1_000_000;
  const now = () => time;
  const partial = fakeWeb({ oga: { clouds: ogaPage("cloud-set") } });
  const base = await withProxy(t, partial.fetchImpl, now);
  await fetch(base + "/api/search?source=auto&q=clouds");
  const after = partial.calls.length;
  await fetch(base + "/api/search?source=auto&q=clouds");
  assert.equal(partial.calls.length, after, "kept for the next minute");
  time += 3 * 60 * 1000;
  await fetch(base + "/api/search?source=auto&q=clouds");
  assert.ok(partial.calls.length > after, "asked the sources again");

  const whole = fakeWeb({
    oga: { clouds: ogaPage("cloud-set") },
    openverse: "empty",
  });
  const base2 = await withProxy(t, whole.fetchImpl, now);
  await fetch(base2 + "/api/search?source=auto&q=clouds");
  const done = whole.calls.length;
  time += 3 * 60 * 60 * 1000;
  await fetch(base2 + "/api/search?source=auto&q=clouds");
  assert.equal(whole.calls.length, done, "a complete answer is still cached");
});
