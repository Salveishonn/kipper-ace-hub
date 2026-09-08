import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useBlobObjectUrl } from "@/hooks/useBlobObjectUrl";

describe("useBlobObjectUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates a blob URL from a successful fetch", async () => {
    const blob = new Blob(["%PDF-1.4"], { type: "application/pdf" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => blob,
      }),
    );
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn().mockReturnValue("blob:http://localhost/pdf"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });

    const { result } = renderHook(() =>
      useBlobObjectUrl("https://qefzutfaawsegmwgaynj.supabase.co/storage/v1/object/sign/file.pdf"),
    );

    await waitFor(() => {
      expect(result.current).toBe("blob:http://localhost/pdf");
    });
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
  });

  it("falls back to the remote URL when fetch fails", async () => {
    const remote = "https://example.supabase.co/file.pdf";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("cors")));

    const { result } = renderHook(() => useBlobObjectUrl(remote));

    await waitFor(() => {
      expect(result.current).toBe(remote);
    });
  });
});
