import express from "express";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createSearchMiddleware } from "./server-api.mjs";

export const defaultStaticDirectory = path.resolve(
  fileURLToPath(new URL("./dist/", import.meta.url)),
);

export function readServerConfig(env = process.env) {
  const raw = env.PORT ?? "5173";
  if (!/^\d+$/.test(raw) || Number(raw) > 65535) {
    throw new Error("PORT must be an integer from 0 to 65535.");
  }
  return {
    host: env.HOST || "127.0.0.1",
    port: Number(raw),
    // Set when a reverse proxy (Caddy, nginx) sits in front: "1" trusts one hop.
    trustProxy: env.TRUST_PROXY || "",
    // Image search sends queries to Wikimedia and Openverse; self-hosters can turn it off.
    search: !/^(0|false|off|no)$/i.test(env.ATLASFORGE_SEARCH || "on"),
  };
}

// Vite fingerprints these files, so browsers may keep them for a year.
const FINGERPRINTED = /\/assets\/[^/]+-[A-Za-z0-9_-]{8}\.(js|css|woff2?)$/;

export function createApp({
  staticDirectory = defaultStaticDirectory,
  trustProxy = "",
  search = true,
  searchMiddleware = createSearchMiddleware(),
} = {}) {
  const directory = path.resolve(staticDirectory);
  const index = path.join(directory, "index.html");
  if (!existsSync(index)) {
    throw new Error(
      "Production build not found. Run npm run build before npm start.",
    );
  }
  const app = express();
  app.disable("x-powered-by");
  if (trustProxy) {
    const hops = Number(trustProxy);
    app.set("trust proxy", Number.isInteger(hops) ? hops : trustProxy);
  }
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
  });
  app.get("/healthz", (_req, res) => res.json({ status: "ok" }));
  if (search) app.use(searchMiddleware);
  else
    app.use("/api", (_req, res) =>
      res.status(404).json({ error: "Image search is turned off on this server." }),
    );
  app.use(
    express.static(directory, {
      setHeaders(res, filePath) {
        // A cached service-worker entry can otherwise delay application updates.
        if (["index.html", "sw.js"].includes(path.basename(filePath))) {
          res.setHeader("Cache-Control", "no-cache");
        } else if (FINGERPRINTED.test(filePath.split(path.sep).join("/"))) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    }),
  );
  app.get("/{*path}", (req, res, next) => {
    // A case mismatch or missing script must not be served the SPA HTML file.
    if (path.posix.extname(req.path) || !req.accepts("html")) return next();
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(index);
  });
  app.use((_req, res) => res.status(404).type("text/plain").send("Not found"));
  return app;
}
