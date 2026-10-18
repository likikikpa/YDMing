// Image search proxy. The browser never talks to Wikimedia/Openverse directly:
// this keeps licence filtering in one place and lets the server cache results.
const DAY = 24 * 60 * 60 * 1000;
const MAX_IMAGE_BYTES = 10_000_000;
const MAX_ALLOWED = 4000;

function send(res, status, body, headers = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  for (const [name, value] of Object.entries(headers))
    res.setHeader(name, value);
  res.end(JSON.stringify(body));
}

/** Fixed-window request counter per client address. */
function createLimiter(limit, windowMs, now) {
  const hits = new Map();
  return (client) => {
    const time = now();
    if (hits.size > 5000)
      for (const [key, entry] of hits)
        if (entry.reset <= time) hits.delete(key);
    let entry = hits.get(client);
    if (!entry || entry.reset <= time) {
      entry = { count: 0, reset: time + windowMs };
      hits.set(client, entry);
    }
    entry.count++;
    return entry.count > limit
      ? Math.max(1, Math.ceil((entry.reset - time) / 1000))
      : 0;
  };
}

/**
 * @param {object} [options]
 * @param {typeof fetch} [options.fetchImpl] replaceable for tests
 * @param {string} [options.contact] contact shown to upstream APIs (Wikimedia asks for one)
 * @param {number} [options.searchLimit] searches per client per window
 * @param {number} [options.imageLimit] image downloads per client per window
 * @param {number} [options.windowMs]
 * @param {() => number} [options.now]
 */
export function createSearchMiddleware({
  fetchImpl = fetch,
  contact = process.env.ATLASFORGE_CONTACT,
  searchLimit = 30,
  imageLimit = 400,
  windowMs = 60_000,
  now = Date.now,
} = {}) {
  const cache = new Map();
  const allowed = new Map();
  const searchWait = createLimiter(searchLimit, windowMs, now);
  const imageWait = createLimiter(imageLimit, windowMs, now);
  const userAgent = `Atlasforge/1.0 (self-hosted map editor${contact ? `; contact: ${contact}` : ""})`;
  let downloads = 0;

  return async function searchMiddleware(req, res, next) {
    const url = new URL(req.url, "http://localhost");
    if (!url.pathname.startsWith("/api/")) return next();
    const client = req.ip || req.socket?.remoteAddress || "unknown";
    try {
      if (url.pathname === "/api/search") {
        const wait = searchWait(client);
        if (wait)
          return send(
            res,
            429,
            { error: "Too many searches. Try again in a minute." },
            { "Retry-After": String(wait) },
          );
        const q = (url.searchParams.get("q") || "").trim().slice(0, 100),
          source =
            url.searchParams.get("source") === "openverse"
              ? "openverse"
              : "commons";
        if (q.length < 2)
          return send(res, 400, { error: "Enter at least two characters." });
        const key = `${source}:${q.toLowerCase()}`;
        const saved = cache.get(key);
        if (saved && now() - saved.at < DAY) return send(res, 200, saved.data);
        let results = [];
        if (source === "openverse") {
          const query = new URLSearchParams({
            q: `${q} map icon`,
            page_size: "20",
            license_type: "commercial,modification",
          });
          const response = await fetchImpl(
            `https://api.openverse.org/v1/images/?${query}`,
            {
              signal: AbortSignal.timeout(12000),
              headers: { "User-Agent": userAgent },
            },
          );
          if (!response.ok)
            throw new Error(
              `Openverse returned ${response.status}. Try Wikimedia Commons.`,
            );
          const data = await response.json();
          results = (data.results || []).map((r) => ({
            id: r.id,
            name: r.title,
            author: r.creator || "Unknown",
            license: `${r.license} ${r.license_version}`,
            url: r.foreign_landing_url,
            image: r.url,
            thumbnail: r.thumbnail || r.url,
          }));
        } else {
          const params = new URLSearchParams({
            action: "query",
            format: "json",
            generator: "search",
            gsrsearch: `${q} filetype:bitmap|drawing`,
            gsrnamespace: "6",
            gsrlimit: "20",
            prop: "imageinfo",
            iiprop: "url|extmetadata",
            iiurlwidth: "300",
          });
          const response = await fetchImpl(
            `https://commons.wikimedia.org/w/api.php?${params}`,
            {
              signal: AbortSignal.timeout(15000),
              headers: { "User-Agent": userAgent },
            },
          );
          if (!response.ok)
            throw new Error(
              response.status === 429
                ? "Wikimedia is busy right now. Try again in a minute or use Openverse."
                : `Wikimedia returned ${response.status}.`,
            );
          const data = await response.json();
          results = Object.values(data.query?.pages || {})
            .map((p) => {
              const i = p.imageinfo?.[0],
                m = i?.extmetadata || {};
              return {
                id: String(p.pageid),
                name: p.title.replace(/^File:/, ""),
                author: (m.Artist?.value || "Unknown").replace(/<[^>]*>/g, ""),
                license: m.LicenseShortName?.value || "",
                url: i?.descriptionurl,
                image: i?.url,
                thumbnail: i?.thumburl,
              };
            })
            .filter(
              (r) =>
                r.image &&
                r.license &&
                /CC|public domain/i.test(r.license) &&
                !/\bNC\b|\bND\b/i.test(r.license),
            );
        }
        results = results.filter((r) => {
          try {
            return (
              new URL(r.image).protocol === "https:" &&
              new URL(r.thumbnail).protocol === "https:"
            );
          } catch {
            return false;
          }
        });
        const time = now();
        for (const result of results) {
          allowed.set(result.image, time);
          allowed.set(result.thumbnail, time);
        }
        for (const [asset, at] of allowed)
          if (time - at > DAY || allowed.size > MAX_ALLOWED)
            allowed.delete(asset);
        const data = { results };
        cache.set(key, { at: time, data });
        if (cache.size > 100) cache.delete(cache.keys().next().value);
        return send(res, 200, data);
      }
      if (url.pathname === "/api/image") {
        const wait = imageWait(client);
        if (wait)
          return send(
            res,
            429,
            { error: "Too many downloads. Try again in a minute." },
            { "Retry-After": String(wait) },
          );
        const target = url.searchParams.get("url");
        if (!target || !allowed.has(target) || now() - allowed.get(target) > DAY)
          return send(res, 403, {
            error: "Search for this asset before importing it.",
          });
        if (downloads >= 8)
          return send(
            res,
            503,
            { error: "The server is busy downloading images. Try again." },
            { "Retry-After": "3" },
          );
        downloads++;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 20000);
        try {
          const response = await fetchImpl(target, {
            signal: controller.signal,
            redirect: "error",
            headers: { "User-Agent": userAgent },
          });
          const mime = response.headers.get("content-type") || "";
          if (
            !response.ok ||
            !/^image\/(png|jpeg|webp|svg\+xml|gif)/.test(mime)
          )
            throw new Error("This source did not return a supported image.");
          if (Number(response.headers.get("content-length")) > MAX_IMAGE_BYTES)
            throw new Error("Image is too large (10 MB maximum).");
          const reader = response.body.getReader();
          const chunks = [];
          let size = 0;
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > MAX_IMAGE_BYTES) {
              await reader.cancel();
              throw new Error("Image is too large (10 MB maximum).");
            }
            chunks.push(value);
          }
          res.statusCode = 200;
          res.setHeader("Content-Type", mime);
          res.setHeader("Cache-Control", "private, max-age=86400");
          // Third-party files must never run script on this origin, even SVGs
          // opened directly in a tab.
          res.setHeader("X-Content-Type-Options", "nosniff");
          res.setHeader(
            "Content-Security-Policy",
            "default-src 'none'; style-src 'unsafe-inline'; sandbox",
          );
          res.end(Buffer.concat(chunks));
          return;
        } finally {
          clearTimeout(timer);
          downloads--;
        }
      }
      send(res, 404, { error: "Unknown endpoint." });
    } catch (error) {
      send(res, 502, { error: String(error.message || error) });
    }
  };
}

export const searchMiddleware = createSearchMiddleware();
