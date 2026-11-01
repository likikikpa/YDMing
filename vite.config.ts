import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { searchMiddleware } from "./server-api.mjs";
export default defineConfig({
  plugins: [
    react(),
    {
      name: "asset-search",
      configureServer(server) {
        server.middlewares.use(searchMiddleware);
      },
      configurePreviewServer(server) {
        server.middlewares.use(searchMiddleware);
      },
    },
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "YDMing Map Studio",
        short_name: "YDMing",
        theme_color: "#29221b",
        background_color: "#29221b",
        display: "standalone",
        icons: [
          {
            src: "/favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,json,png,txt,ttf,jpg}"],
        maximumFileSizeToCacheInBytes: 6000000,
        // The AI_GEN, Hand-inked and Pen-ink pictures are several MB: kept out of the
        // first-load download, cached for offline use the first time each one is shown.
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              /^\/assets\/(ai-gen|hand-inked|pen-ink)\//.test(url.pathname),
            handler: "CacheFirst",
            options: {
              cacheName: "ai-gen-stamps",
              expiration: { maxEntries: 300 },
            },
          },
        ],
      },
    }),
  ],
  server: { port: 5173 },
  build: { chunkSizeWarningLimit: 1500 },
});
