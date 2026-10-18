import express from "express";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { searchMiddleware } from "./server-api.mjs";

export const defaultStaticDirectory = path.resolve(
  fileURLToPath(new URL("./dist/", import.meta.url)),
);

export function readServerConfig(env = process.env) {
  const raw = env.PORT ?? "5173";
  if (!/^\d+$/.test(raw) || Number(raw) > 65535) {
    throw new Error("PORT must be an integer from 0 to 65535.");
  }
  return { host: env.HOST || "127.0.0.1", port: Number(raw) };
}

export function createApp({ staticDirectory = defaultStaticDirectory } = {}) {
  const directory = path.resolve(staticDirectory);
  const index = path.join(directory, "index.html");
  if (!existsSync(index)) {
    throw new Error(
      "Production build not found. Run npm run build before npm start.",
    );
  }
  const app = express();
  app.disable("x-powered-by");
  app.get("/healthz", (_req, res) => res.json({ status: "ok" }));
  app.use(searchMiddleware);
  app.use(
    express.static(directory, {
      setHeaders(res, filePath) {
        // A cached service-worker entry can otherwise delay application updates.
        if (["index.html", "sw.js"].includes(path.basename(filePath))) {
          res.setHeader("Cache-Control", "no-cache");
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
