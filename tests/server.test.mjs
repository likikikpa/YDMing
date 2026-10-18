import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import {
  createApp,
  defaultStaticDirectory,
  readServerConfig,
} from "../server-app.mjs";
import { createSearchMiddleware } from "../server-api.mjs";

test("server validates its port and defaults to local-only access", () => {
  assert.deepEqual(readServerConfig({}), {
    host: "127.0.0.1",
    port: 5173,
    trustProxy: "",
    search: true,
  });
  assert.deepEqual(readServerConfig({ HOST: "0.0.0.0", PORT: "8080" }), {
    host: "0.0.0.0",
    port: 8080,
    trustProxy: "",
    search: true,
  });
  assert.equal(readServerConfig({ TRUST_PROXY: "1" }).trustProxy, "1");
  assert.equal(readServerConfig({ ATLASFORGE_SEARCH: "off" }).search, false);
  assert.equal(readServerConfig({ PORT: "0" }).port, 0);
  for (const PORT of ["", "abc", "-1", "65536", "5173.5"])
    assert.throws(() => readServerConfig({ PORT }), /PORT/);
  assert.equal(
    defaultStaticDirectory,
    path.resolve(import.meta.dirname, "../dist"),
  );
});

test("missing builds report the command needed to create them", () => {
  assert.throws(
    () =>
      createApp({
        staticDirectory: path.join(
          os.tmpdir(),
          "atlasforge-missing-" + Date.now(),
        ),
      }),
    /npm run build/,
  );
});

test("serves assets, health and navigation from directories containing spaces", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "atlasforge server "));
  await mkdir(path.join(directory, "assets"));
  await writeFile(
    path.join(directory, "index.html"),
    "<!doctype html><title>Atlasforge fixture</title>",
  );
  await writeFile(
    path.join(directory, "assets", "editor.js"),
    "console.log('map');",
  );
  await writeFile(path.join(directory, "sw.js"), "/* service worker */");
  const server = createApp({ staticDirectory: directory }).listen(
    0,
    "127.0.0.1",
  );
  t.after(async () => {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    assert.equal(
      path.dirname(path.resolve(directory)),
      path.resolve(os.tmpdir()),
    );
    await rm(directory, { recursive: true, force: true });
  });
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.deepEqual(await (await fetch(base + "/healthz")).json(), {
    status: "ok",
  });
  const index = await fetch(base + "/");
  assert.equal(index.status, 200);
  assert.equal(index.headers.get("cache-control"), "no-cache");
  assert.match(await index.text(), /Atlasforge fixture/);
  assert.equal(
    (await fetch(base + "/maps/example", { headers: { Accept: "text/html" } }))
      .status,
    200,
  );
  assert.match(
    await (await fetch(base + "/assets/editor.js")).text(),
    /console.log/,
  );
  const missing = await fetch(base + "/assets/missing.js");
  assert.equal(missing.status, 404);
  assert.equal(await missing.text(), "Not found");
  assert.equal(
    (await fetch(base + "/sw.js")).headers.get("cache-control"),
    "no-cache",
  );
  assert.equal((await fetch(base + "/api/unknown")).status, 404);
});

async function withServer(t, options, setup) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "atlasforge api "));
  await mkdir(path.join(directory, "assets"));
  await writeFile(path.join(directory, "index.html"), "<!doctype html>ok");
  await writeFile(path.join(directory, "assets", "index-AbCd1234.js"), "1");
  const server = createApp({ staticDirectory: directory, ...options }).listen(
    0,
    "127.0.0.1",
  );
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  });
  await once(server, "listening");
  return `http://127.0.0.1:${server.address().port}`;
}

test("sends security headers and long-lived caching only for fingerprinted assets", async (t) => {
  const base = await withServer(t, {});
  const asset = await fetch(base + "/assets/index-AbCd1234.js");
  assert.match(asset.headers.get("cache-control"), /immutable/);
  assert.equal(asset.headers.get("x-content-type-options"), "nosniff");
  assert.equal(asset.headers.get("x-powered-by"), null);
  assert.equal(
    (await fetch(base + "/")).headers.get("x-frame-options"),
    "SAMEORIGIN",
  );
});

test("image search can be switched off for private installs", async (t) => {
  const base = await withServer(t, { search: false });
  const response = await fetch(base + "/api/search?q=castle");
  assert.equal(response.status, 404);
  assert.match((await response.json()).error, /turned off/);
});

test("search proxy filters licences, limits clients and only serves searched images", async (t) => {
  const calls = [];
  const fakeFetch = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).startsWith("https://commons.wikimedia.org")) {
      const page = (id, title, license, artist = "<b>Ann</b>") => ({
        pageid: id,
        title: `File:${title}`,
        imageinfo: [
          {
            url: `https://upload.wikimedia.org/${title}`,
            thumburl: `https://thumb.wikimedia.org/${title}`,
            descriptionurl: `https://commons.wikimedia.org/wiki/File:${title}`,
            extmetadata: {
              LicenseShortName: { value: license },
              Artist: { value: artist },
            },
          },
        ],
      });
      return Response.json({
        query: {
          pages: {
            1: page(1, "ok.png", "CC BY-SA 4.0"),
            2: page(2, "nc.png", "CC BY-NC 4.0"),
            3: page(3, "all-rights.png", "All rights reserved"),
          },
        },
      });
    }
    return new Response(new Uint8Array([137, 80, 78, 71]), {
      headers: { "content-type": "image/png" },
    });
  };
  const base = await withServer(t, {
    searchMiddleware: createSearchMiddleware({
      fetchImpl: fakeFetch,
      contact: "dm@example.com",
      searchLimit: 3,
    }),
  });
  const found = await (await fetch(base + "/api/search?q=Castle")).json();
  assert.deepEqual(
    found.results.map((r) => [r.name, r.author, r.license]),
    [["ok.png", "Ann", "CC BY-SA 4.0"]],
  );
  assert.match(calls[0].init.headers["User-Agent"], /dm@example\.com/);
  // Same query again is answered from the cache.
  await fetch(base + "/api/search?q=castle");
  assert.equal(calls.length, 1);
  const image = await fetch(
    base + "/api/image?url=" + encodeURIComponent(found.results[0].image),
  );
  assert.equal(image.status, 200);
  assert.equal(image.headers.get("content-type"), "image/png");
  assert.match(image.headers.get("content-security-policy"), /sandbox/);
  assert.equal(
    (
      await fetch(
        base + "/api/image?url=" + encodeURIComponent("https://example.com/x.png"),
      )
    ).status,
    403,
  );
  assert.equal((await fetch(base + "/api/search?q=a")).status, 400);
  await fetch(base + "/api/search?q=tower");
  const limited = await fetch(base + "/api/search?q=keep");
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get("retry-after")) >= 1);
});
