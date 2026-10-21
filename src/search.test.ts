import { describe, expect, it } from "vitest";
import { readSearchReply } from "./search";

describe("image search replies", () => {
  it("returns the results of a normal reply", () => {
    expect(readSearchReply(true, '{"results":[]}')).toEqual({ results: [] });
  });
  it("passes on the sources that did not answer", () => {
    expect(
      readSearchReply(true, '{"results":[],"unavailable":["Openverse"]}'),
    ).toEqual({ results: [], unavailable: ["Openverse"] });
    expect(readSearchReply(true, '{"results":[],"unavailable":[]}')).toEqual({
      results: [],
    });
  });
  it("treats a plain-text page as having no YDMing server", () => {
    // A static host answers /api/search with "not found " instead of JSON.
    expect(readSearchReply(false, "not found ")).toEqual({
      problem: "no-server",
    });
    expect(readSearchReply(false, "<html>502 Bad Gateway</html>")).toEqual({
      problem: "no-server",
    });
  });
  it("passes on the server's own error message", () => {
    expect(
      readSearchReply(
        false,
        '{"error":"Image search is turned off on this server."}',
      ),
    ).toEqual({
      problem: "message",
      message: "Image search is turned off on this server.",
    });
  });
  it("does not trust JSON that is not a search reply", () => {
    expect(readSearchReply(true, '{"status":"ok"}')).toEqual({
      problem: "no-server",
    });
  });
});
