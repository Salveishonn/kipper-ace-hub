import { describe, it, expect } from "vitest";
import { designResourcePreviewPath } from "@/hooks/useDesignResources";

describe("designResourcePreviewPath", () => {
  it("prefers the dedicated preview image", () => {
    expect(
      designResourcePreviewPath({
        preview_path: "previews/a.png",
        download_path: "files/a.jpg",
      }),
    ).toBe("previews/a.png");
  });

  it("falls back to an image download file", () => {
    expect(
      designResourcePreviewPath({
        preview_path: null,
        download_path: "files/1787073427807-ACCIDENTES_PERSONALES___.jpg",
      }),
    ).toBe("files/1787073427807-ACCIDENTES_PERSONALES___.jpg");
  });

  it("does not use a non-image download as preview", () => {
    expect(
      designResourcePreviewPath({
        preview_path: null,
        download_path: "files/pack.zip",
      }),
    ).toBeNull();
  });
});
