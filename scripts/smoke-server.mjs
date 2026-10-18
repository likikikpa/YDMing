import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import os from "node:os";
import assert from "node:assert/strict";

// Intentionally launch outside the project to catch cwd-dependent paths.
const child = spawn(
  process.execPath,
  [fileURLToPath(new URL("../server.mjs", import.meta.url))],
  {
    cwd: os.tmpdir(),
    env: { ...process.env, HOST: "127.0.0.1", PORT: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let output = "";
child.stdout.on("data", (chunk) => (output += chunk));
child.stderr.on("data", (chunk) => (output += chunk));
try {
  const deadline = Date.now() + 15000;
  while (!/ready at (http:\/\/[^\s]+)/.test(output)) {
    if (child.exitCode !== null) throw new Error(`Server exited: ${output}`);
    if (Date.now() > deadline)
      throw new Error(`Server did not become ready: ${output}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const url = output.match(/ready at (http:\/\/[^\s]+)/)[1];
  assert.deepEqual(await (await fetch(`${url}/healthz`)).json(), {
    status: "ok",
  });
  const index = await fetch(url);
  assert.equal(index.status, 200);
  const html = await index.text();
  assert.match(html, /<title>Atlasforge/);
  const script = html.match(/src="([^"]+\.js)"/)[1];
  assert.match(
    (await fetch(new URL(script, url))).headers.get("content-type"),
    /javascript/,
  );
  for (const asset of [
    "/favicon.svg",
    "/fonts/NotoSans-Regular.ttf",
    "/assets/cartography/castle.png",
    "/manifest.webmanifest",
    "/sw.js",
  ]) {
    assert.equal((await fetch(`${url}${asset}`)).status, 200, asset);
  }
  assert.equal((await fetch(`${url}/assets/missing.js`)).status, 404);
  console.log(
    "Production server smoke check passed, including assets and startup from another directory.",
  );
} finally {
  if (child.exitCode === null) {
    const exited = once(child, "exit");
    child.kill("SIGTERM");
    await exited;
  }
}
