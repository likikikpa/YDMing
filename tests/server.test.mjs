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

test("server validates its port and defaults to local-only access", () => {
  assert.deepEqual(readServerConfig({}), { host: "127.0.0.1", port: 5173 });
  assert.deepEqual(readServerConfig({ HOST: "0.0.0.0", PORT: "8080" }), {
    host: "0.0.0.0",
    port: 8080,
  });
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
