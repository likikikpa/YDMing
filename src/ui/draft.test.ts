import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDraft } from "./draft";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("createDraft", () => {
  it("applies only the last text, once, after a pause in typing", () => {
    const d = createDraft(300),
      apply = vi.fn();
    for (const t of ["T", "Th", "The"]) {
      d.type(t, apply);
      vi.advanceTimersByTime(100);
    }
    expect(apply).not.toHaveBeenCalled();
    expect(d.pending).toBe(true);
    vi.advanceTimersByTime(300);
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith("The");
    expect(d.pending).toBe(false);
  });

  it("applies at once on flush, and not again when the timer would have fired", () => {
    const d = createDraft(300),
      apply = vi.fn();
    d.type("abc", apply);
    d.flush();
    expect(apply).toHaveBeenCalledWith("abc");
    vi.advanceTimersByTime(1000);
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it("does nothing on flush when nothing was typed", () => {
    const d = createDraft(300);
    expect(() => d.flush()).not.toThrow();
  });

  it("drops the text on cancel", () => {
    const d = createDraft(300),
      apply = vi.fn();
    d.type("abc", apply);
    d.cancel();
    vi.advanceTimersByTime(1000);
    expect(apply).not.toHaveBeenCalled();
    expect(d.pending).toBe(false);
  });

  it("applies with the function it was typed with, even after another is passed later", () => {
    const d = createDraft(300),
      first = vi.fn(),
      second = vi.fn();
    d.type("abc", first);
    d.flush();
    d.type("xyz", second);
    d.flush();
    expect(first).toHaveBeenCalledWith("abc");
    expect(second).toHaveBeenCalledWith("xyz");
  });
});
