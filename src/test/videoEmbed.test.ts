import { describe, expect, it } from "vitest";
import { getVideoEmbedUrl, officeEmbedUrl } from "@/lib/videoEmbed";

describe("getVideoEmbedUrl", () => {
  it("converts watch and short YouTube URLs to the embed player", () => {
    expect(getVideoEmbedUrl("https://youtu.be/6ADuJwTHLwA")).toBe(
      "https://www.youtube.com/embed/6ADuJwTHLwA",
    );
    expect(getVideoEmbedUrl("https://www.youtube.com/watch?v=abc123")).toBe(
      "https://www.youtube.com/embed/abc123",
    );
    expect(getVideoEmbedUrl("https://youtube.com/watch?v=abc123")).toBe(
      "https://www.youtube.com/embed/abc123",
    );
  });

  it("converts Vimeo URLs", () => {
    expect(getVideoEmbedUrl("https://vimeo.com/12345")).toBe("https://player.vimeo.com/video/12345");
  });
});

describe("officeEmbedUrl", () => {
  it("wraps a signed file URL for Office Online", () => {
    const src = "https://example.supabase.co/file.docx?token=1";
    expect(officeEmbedUrl(src)).toBe(
      `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(src)}`,
    );
  });
});
