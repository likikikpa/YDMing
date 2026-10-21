import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { createApp } from "../server-app.mjs";
import { createSearchMiddleware } from "../server-api.mjs";
import { readOpenGameArt } from "../server-sources.mjs";
import {
  classifyQuery,
  inkIcon,
  loadSpriteIndex,
  searchIndex,
} from "../server-sprites.mjs";

const index = loadSpriteIndex();
const ICON = "https://cdn.jsdelivr.net/gh/game-icons/icons@master/";

test("short queries ask for sprites, descriptions and photo words for pictures", () => {
  assert.equal(classifyQuery("clouds").mode, "sprite");
  assert.equal(classifyQuery("pine forest").mode, "sprite");
  assert.deepEqual(classifyQuery("cloud realistic picture"), {
    mode: "art",
    terms: ["cloud"],
    text: "cloud",
  });
  assert.equal(classifyQuery("a dark ruined castle on a hill").mode, "art");
  // Asking for a sprite outright wins over a long query.
  assert.equal(classifyQuery("old stone castle tower icon").mode, "sprite");
  assert.deepEqual(classifyQuery("Dragon tokens").terms, ["dragon"]);
});

test("the index matches whole words, plurals and map synonyms", () => {
  const names = (q, style) =>
    searchIndex(index, classifyQuery(q).terms, { style }).map((r) => r.name);
  const clouds = names("clouds");
  assert.ok(clouds.length > 3);
  assert.ok(clouds.every((n) => /cloud/i.test(n)));
  // Computer icons go after the weather.
  assert.ok(clouds.indexOf("Cloud Download") > clouds.indexOf("Fluffy Cloud"));
  assert.ok(!names("lake").some((n) => /snowflake/i.test(n)));
  assert.ok(!names("mine").some((n) => /jasmine/i.test(n)));
  assert.ok(names("tavern").includes("Tavern Sign"));
  // "inn" finds taverns through a synonym.
  assert.ok(names("inn").includes("Tavern Sign"));
  // Parchment maps get the ink cartography sprites first, painted maps the coloured ones.
  assert.equal(
    searchIndex(index, ["tree"], { style: "parchment" })[0].author,
    "Kenney",
  );
  // Coloured sprites lead on painted maps (Kenney's coloured set has no named trees).
  const mixed = {
    entries: [
      { look: "ink", tags: new Set(["tree"]), result: { id: "ink" } },
      { look: "colour", tags: new Set(["tree"]), result: { id: "colour" } },
    ],
  };
  assert.equal(
    searchIndex(mixed, ["tree"], { style: "painted" })[0].id,
    "colour",
  );
  assert.equal(searchIndex(mixed, ["tree"], { style: "atlas" })[0].id, "ink");
});

test("icons lose their black square and take map ink", () => {
  const svg =
    '<svg viewBox="0 0 512 512"><path d="M0 0h512v512H0z"/><path fill="#fff" d="M1 1"/></svg>';
  assert.equal(
    inkIcon(svg),
    '<svg viewBox="0 0 512 512"><path fill="#3b2a1a" d="M1 1"/></svg>',
  );
});

const OGA_PAGE = `
<div class="views-row views-row-1 art-previews-inline"><div class="field-item even" property="dc:title"><span class="art-preview-title"><a href="/content/cloud-set">Cloud Set &amp; Sky</a></span></div><a href="/content/cloud-set"><img src='https://opengameart.org/sites/default/files/styles/thumbnail/public/clouds.png'  alt='Preview'></a></div>
<div class="views-row views-row-2 art-previews-inline"><span class="art-preview-title"><a href="/content/no-preview">No preview</a></span></div>
<div class="views-row views-row-3 art-previews-inline"><span class="art-preview-title"><a href="/content/elsewhere">Elsewhere</a></span><img src='https://evil.example/x.png'></div>`;

test("reads OpenGameArt results and skips entries without an OpenGameArt preview", () => {
  assert.deepEqual(readOpenGameArt(OGA_PAGE), [
    {
      id: "oga:cloud-set",
      name: "Cloud Set & Sky",
      author: "OpenGameArt",
      license: "CC0",
      url: "https://opengameart.org/content/cloud-set",
      image: "https://opengameart.org/sites/default/files/clouds.png",
      thumbnail:
        "https://opengameart.org/sites/default/files/styles/thumbnail/public/clouds.png",
    },
  ]);
});

async function withSearch(t, fetchImpl) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "ydming sprites "));
  await mkdir(path.join(directory, "assets"));
  await writeFile(path.join(directory, "index.html"), "<!doctype html>ok");
  const server = createApp({
    staticDirectory: directory,
    searchMiddleware: createSearchMiddleware({ fetchImpl, spriteIndex: index }),
  }).listen(0, "127.0.0.1");
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  });
  await once(server, "listening");
  return `http://127.0.0.1:${server.address().port}`;
}

test("the automatic search puts sprites first and survives a failing source", async (t) => {
  const calls = [];
  const base = await withSearch(t, async (url) => {
    url = String(url);
    calls.push(url);
    if (url.startsWith("https://opengameart.org/art-search"))
      return new Response(OGA_PAGE);
    if (url.startsWith("https://api.openverse.org"))
      return new Response("down", { status: 500 });
    if (url.startsWith(ICON))
      return new Response(
        '<svg><path d="M0 0h512v512H0z"/><path fill="#fff" d="M1 1"/></svg>',
        { headers: { "content-type": "image/svg+xml; charset=utf-8" } },
      );
    throw new Error(`unexpected ${url}`);
  });
  const { results } = await (
    await fetch(base + "/api/search?source=auto&q=clouds")
  ).json();
  assert.match(results[0].id, /^game-icons:/);
  assert.ok(results.some((r) => r.id === "oga:cloud-set"));
  assert.ok(calls.some((u) => /keys=clouds/.test(u) && /licenses_tid/.test(u)));
  const openverse = calls.find((u) => u.startsWith("https://api.openverse"));
  assert.match(openverse, /category=illustration/);
  // A searched icon is served recoloured, with the sandbox policy.
  const icon = await fetch(
    base + "/api/image?url=" + encodeURIComponent(results[0].image),
  );
  assert.equal(icon.status, 200);
  assert.match(icon.headers.get("content-security-policy"), /sandbox/);
  assert.equal(await icon.text(), '<svg><path fill="#3b2a1a" d="M1 1"/></svg>');
  // Built-in sprites come back as app paths and are not proxied.
  const castle = await (
    await fetch(base + "/api/search?source=auto&q=castle")
  ).json();
  const builtIn = castle.results.find((r) => r.author === "Kenney");
  assert.match(builtIn.image, /^\/assets\/(cartography|medieval)\//);
});

test("a picture query asks Wikimedia for bitmaps first", async (t) => {
  const calls = [];
  const base = await withSearch(t, async (url) => {
    calls.push(String(url));
    if (String(url).startsWith("https://commons.wikimedia.org"))
      return Response.json({
        query: {
          pages: {
            1: {
              pageid: 1,
              title: "File:Sky.jpg",
              imageinfo: [
                {
                  url: "https://upload.wikimedia.org/sky.jpg",
                  thumburl: "https://upload.wikimedia.org/sky-thumb.jpg",
                  descriptionurl:
                    "https://commons.wikimedia.org/wiki/File:Sky.jpg",
                  extmetadata: {
                    LicenseShortName: { value: "CC BY 4.0" },
                    Artist: { value: "Ann" },
                  },
                },
              ],
            },
          },
        },
      });
    return Response.json({ results: [] });
  });
  const { results } = await (
    await fetch(base + "/api/search?source=auto&q=cloud realistic picture")
  ).json();
  assert.equal(results[0].name, "Sky.jpg");
  // Sprites still follow the pictures.
  assert.ok(results.slice(1).some((r) => r.id.startsWith("game-icons:")));
  const commons = decodeURIComponent(
    calls.find((u) => u.includes("wikimedia")),
  );
  assert.match(commons, /filetype:bitmap/);
  assert.doesNotMatch(commons, /drawing/);
});

test("all sources failing with no sprites reports the error", async (t) => {
  const base = await withSearch(
    t,
    async () => new Response("", { status: 503 }),
  );
  const reply = await fetch(base + "/api/search?source=auto&q=zzqx");
  assert.equal(reply.status, 502);
  assert.match((await reply.json()).error, /OpenGameArt|Openverse/);
});

test("a source that hangs is dropped after the wait", async () => {
  const { searchAuto } = await import("../server-sprites.mjs");
  const started = Date.now();
  const results = await searchAuto({
    index,
    fetchImpl: (url) =>
      String(url).includes("opengameart")
        ? Promise.resolve(new Response(OGA_PAGE))
        : new Promise(() => {}),
    userAgent: "test",
    q: "clouds",
    wait: 200,
  });
  assert.ok(Date.now() - started < 2000);
  assert.ok(results.some((r) => r.id === "oga:cloud-set"));
});
