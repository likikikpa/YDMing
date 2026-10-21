// Upstream image sources for the search proxy in server-api.mjs. Each returns
// results already mapped to { id, name, author, license, url, image, thumbnail }.

export async function searchOpenverse({ fetchImpl, userAgent, q }) {
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
  return (data.results || []).map((r) => ({
    id: r.id,
    name: r.title,
    author: r.creator || "Unknown",
    license: `${r.license} ${r.license_version}`,
    url: r.foreign_landing_url,
    image: r.url,
    thumbnail: r.thumbnail || r.url,
  }));
}

export async function searchCommons({ fetchImpl, userAgent, q }) {
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
  return Object.values(data.query?.pages || {})
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
