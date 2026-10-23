import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./render", () => {
  const imageCache = new Map<string, { complete: boolean }>();
  return {
    imageCache,
    loadImage: vi.fn(async (src: string) => {
      if (src.includes("missing")) throw new Error("404");
      imageCache.set(src, { complete: true });
      return {};
    }),
  };
});

import { onSpritesLoaded, wantSprite } from "./decor-sprites";
import { imageCache, loadImage } from "./render";

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("pictures asked for while drawing", () => {
  beforeEach(() => {
    imageCache.clear();
    vi.mocked(loadImage).mockClear();
  });

  it("load together once, however often they are asked for, and tell listeners once", async () => {
    const heard = vi.fn(),
      stop = onSpritesLoaded(heard);
    wantSprite("/a.webp");
    wantSprite("/b.webp");
    wantSprite("/a.webp");
    // Drawn again while they load: no second request.
    await Promise.resolve();
    wantSprite("/b.webp");
    await settle();
    expect(loadImage).toHaveBeenCalledTimes(2);
    expect(heard).toHaveBeenCalledTimes(1);
    stop();
  });

  it("are not asked for again once they have loaded", async () => {
    wantSprite("/c.webp");
    await settle();
    wantSprite("/c.webp");
    await settle();
    expect(loadImage).toHaveBeenCalledTimes(1);
  });

  it("are asked for once if they fail, and tell nobody when none arrive", async () => {
    const heard = vi.fn(),
      stop = onSpritesLoaded(heard);
    wantSprite("/missing-1.webp");
    await settle();
    wantSprite("/missing-1.webp");
    await settle();
    expect(loadImage).toHaveBeenCalledTimes(1);
    expect(heard).not.toHaveBeenCalled();
    stop();
  });

  it("stop telling a listener that has gone", async () => {
    const heard = vi.fn();
    onSpritesLoaded(heard)();
    wantSprite("/d.webp");
    await settle();
    expect(heard).not.toHaveBeenCalled();
  });
});
