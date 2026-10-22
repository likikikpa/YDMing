import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { packImages } from "./pack-import";

const bytes = (n: number) => new Uint8Array(n).fill(7);
const zip = (files: Record<string, Uint8Array>, name = "pack.zip") =>
  new File([zipSync(files) as BlobPart], name);

describe("importing a stamp pack", () => {
  it("takes the images out of a ZIP and names them after their files", async () => {
    const images = await packImages([
      zip({
        "trees/oak_tree-02.png": bytes(30),
        "trees/oak_tree-01.PNG": bytes(30),
        "houses/Hut.webp": bytes(20),
      }),
    ]);
    expect(images.map((i) => i.name)).toEqual([
      "Hut",
      "oak tree 01",
      "oak tree 02",
    ]);
    expect(images[0].blob.type).toBe("image/webp");
    expect(images[1].blob.size).toBe(30);
  });

  it("skips folders, hidden files, macOS metadata and other formats", async () => {
    const images = await packImages([
      zip({
        "__MACOSX/pack/._tree.png": bytes(10),
        "pack/.hidden.png": bytes(10),
        "pack/readme.txt": bytes(10),
        "pack/license.pdf": bytes(10),
        "pack/tree.png": bytes(10),
      }),
    ]);
    expect(images.map((i) => i.name)).toEqual(["tree"]);
  });

  it("accepts loose image files next to a ZIP", async () => {
    const images = await packImages([
      new File([bytes(5)], "well.png", { type: "image/png" }),
      new File([bytes(5)], "notes.txt"),
      zip({ "a.png": bytes(5) }),
    ]);
    expect(images.map((i) => i.name)).toEqual(["well", "a"]);
  });

  it("skips a picture over 10 MB instead of loading it", async () => {
    const images = await packImages([
      zip({ "big.png": bytes(10_000_001), "small.png": bytes(10) }),
    ]);
    expect(images.map((i) => i.name)).toEqual(["small"]);
  });

  it("stops with advice when a pack has too many images", async () => {
    const many: Record<string, Uint8Array> = {};
    for (let i = 0; i < 601; i++) many[`s${i}.png`] = bytes(4);
    await expect(packImages([zip(many)])).rejects.toThrow(/Split it/);
  });

  it("says which file is not a usable ZIP", async () => {
    await expect(
      packImages([new File([bytes(40)], "broken.zip")]),
    ).rejects.toThrow(/broken\.zip/);
  });

  it("returns nothing when no picture is found", async () => {
    expect(await packImages([zip({ "readme.txt": bytes(3) })])).toEqual([]);
  });
});
