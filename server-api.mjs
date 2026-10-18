const cache = new Map();
const allowed = new Map();
const ttl = 24 * 60 * 60 * 1000;
function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}
export async function searchMiddleware(req, res, next) {
  const url = new URL(req.url, "http://localhost");
  if (!url.pathname.startsWith("/api/")) return next();
  try {
    if (url.pathname === "/api/search") {
      const q = (url.searchParams.get("q") || "").trim().slice(0, 100),
        source = url.searchParams.get("source") || "commons";
      if (q.length < 2)
        return send(res, 400, { error: "Enter at least two characters." });
      const key = source + q + url.searchParams.get("commercial");
      const saved = cache.get(key);
      if (saved && Date.now() - saved.at < ttl)
        return send(res, 200, saved.data);
      let results = [];
      if (source === "openverse") {
        const query = new URLSearchParams({
          q: `${q} map icon`,
          page_size: "20",
          license_type: "commercial,modification",
        });
        const response = await fetch(
          `https://api.openverse.org/v1/images/?${query}`,
          {
            signal: AbortSignal.timeout(12000),
            headers: { "User-Agent": "Atlasforge/0.1 (local map editor)" },
          },
        );
        if (!response.ok)
          throw new Error(
            `Openverse returned ${response.status}. Try Wikimedia Commons.`,
          );
        const data = await response.json();
        results = data.results.map((r) => ({
          id: r.id,
          name: r.title,
          author: r.creator || "Unknown",
          license: `${r.license} ${r.license_version}`,
          url: r.foreign_landing_url,
          image: r.url,
          thumbnail: r.thumbnail,
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
        const response = await fetch(
          `https://commons.wikimedia.org/w/api.php?${params}`,
          {
            signal: AbortSignal.timeout(15000),
            headers: {
              "User-Agent":
                "Atlasforge/0.1 (local map editor; educational cartography)",
            },
          },
        );
        if (!response.ok)
          throw new Error(`Wikimedia returned ${response.status}.`);
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
      for (const result of results) {
        allowed.set(result.image, Date.now());
        allowed.set(result.thumbnail, Date.now());
      }
      const data = { results };
      cache.set(key, { at: Date.now(), data });
      if (cache.size > 100) cache.delete(cache.keys().next().value);
      for (const [asset, at] of allowed)
        if (Date.now() - at > ttl) allowed.delete(asset);
      return send(res, 200, data);
    }
    if (url.pathname === "/api/image") {
      const target = url.searchParams.get("url");
      if (
        !target ||
        !allowed.has(target) ||
        Date.now() - allowed.get(target) > ttl
      )
        return send(res, 403, {
          error: "Search for this asset before importing it.",
        });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      try {
        const response = await fetch(target, {
          signal: controller.signal,
          redirect: "error",
          headers: { "User-Agent": "Atlasforge/0.1 local map editor" },
        });
        const mime = response.headers.get("content-type") || "";
        if (!response.ok || !/^image\/(png|jpeg|webp|svg\+xml|gif)/.test(mime))
          throw new Error("This source did not return a supported image.");
        if (Number(response.headers.get("content-length")) > 10_000_000)
          throw new Error("Image is too large (10 MB maximum).");
        const reader = response.body.getReader();
        const chunks = [];
        let size = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 10_000_000) {
            await reader.cancel();
            throw new Error("Image is too large (10 MB maximum).");
          }
          chunks.push(value);
        }
        res.statusCode = 200;
        res.setHeader("Content-Type", mime);
        res.setHeader("Cache-Control", "private, max-age=86400");
        res.end(Buffer.concat(chunks));
        return;
      } finally {
        clearTimeout(timer);
      }
    }
    send(res, 404, { error: "Unknown endpoint." });
  } catch (error) {
    send(res, 502, { error: String(error.message || error) });
  }
}
