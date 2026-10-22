// Downloads a free file from an itch.io game page the way its "Download"
// button does: itch.io answers a form post with a short-lived link.
export async function itchDownload(page, uploadId) {
  const first = await fetch(page, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!first.ok) throw new Error(`${first.status} loading ${page}`);
  const token = (await first.text()).match(/csrf_token" value="([^"]+)"/)?.[1];
  if (!token) throw new Error("itch.io page has no download form any more");
  const link = await fetch(
    `${page}/file/${uploadId}?source=view_game&as_props=1&after_download_lightbox=true`,
    {
      method: "POST",
      headers: {
        "user-agent": "Mozilla/5.0",
        cookie: first.headers
          .getSetCookie()
          .map((c) => c.split(";")[0])
          .join("; "),
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ csrf_token: token }),
    },
  );
  if (!link.ok) throw new Error(`${link.status} asking for the download link`);
  const { url } = await link.json();
  const file = await fetch(url);
  if (!file.ok) throw new Error(`${file.status} downloading ${uploadId}`);
  return new Uint8Array(await file.arrayBuffer());
}

/** The width and height of a PNG, read from its header. */
export function pngSize(png) {
  const view = new DataView(png.buffer, png.byteOffset);
  return [view.getUint32(16), view.getUint32(20)];
}
