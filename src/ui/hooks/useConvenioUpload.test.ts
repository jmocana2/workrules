import { supabase } from "@/lib/supabase";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useConvenioUpload } from "./useConvenioUpload";

// Mock Supabase
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    storage: {
      from: vi.fn(),
    },
    functions: {
      invoke: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe("useConvenioUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("should start in idle state", () => {
    const { result } = renderHook(() => useConvenioUpload());
    expect(result.current.state.status).toBe("idle");
  });

  it("should upload file successfully", async () => {
    // Mock user authentication
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: "user-123" } },
    });

    // Mock session for access token
    (supabase.auth as any).getSession = vi.fn().mockResolvedValue({
      data: { session: { access_token: "fake-token" } },
    });

    // Mock fetch for file upload
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", mockFetch);

    const mockGetPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: "https://example.com/test.pdf" },
    });

    (supabase.storage.from as any).mockReturnValue({
      getPublicUrl: mockGetPublicUrl,
    });

    const { result } = renderHook(() => useConvenioUpload());

    const file = new File(["test"], "test.pdf", { type: "application/pdf" });

    let uploadResult;
    await act(async () => {
      uploadResult = await result.current.uploadFile(file);
    });

    expect(result.current.state.status).toBe("preview");
    expect(uploadResult).toEqual({
      fileUrl: "https://example.com/test.pdf",
      filePath: expect.stringContaining("user-123/"),
    });
  });

  it("should handle upload errors", async () => {
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: "user-123" } },
    });

    // Mock session for access token
    (supabase.auth as any).getSession = vi.fn().mockResolvedValue({
      data: { session: { access_token: "fake-token" } },
    });

    // Mock fetch to return error
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Upload failed" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const onError = vi.fn();
    const { result } = renderHook(() => useConvenioUpload({ onError }));

    const file = new File(["test"], "test.pdf", { type: "application/pdf" });

    await act(async () => {
      await result.current.uploadFile(file);
    });

    expect(result.current.state.status).toBe("error");
    expect(onError).toHaveBeenCalledWith(expect.any(String));
  });

  it("should confirm upload and start polling", async () => {
    // Mock edge function response
    (supabase.functions.invoke as any).mockResolvedValue({
      data: { convenio_id: "convenio-123" },
      error: null,
    });

    // Mock polling response - return active immediately
    const mockEq = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: { estado: "activo", error_message: null },
        error: null,
      }),
    });

    const mockSelect = vi.fn().mockReturnValue({
      eq: mockEq,
    });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });

    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useConvenioUpload({ onSuccess, pollingIntervalMs: 50 })
    );

    await act(async () => {
      await result.current.confirmUpload(
        "https://example.com/test.pdf",
        "test.pdf",
      );
    });

    expect(result.current.state.status).toBe("processing");

    // Wait for polling to complete
    await waitFor(() => {
      expect(result.current.state.status).toBe("ready");
    }, { timeout: 1000 });

    expect(onSuccess).toHaveBeenCalledWith("convenio-123");
  });

  it("should handle processing errors", async () => {
    (supabase.functions.invoke as any).mockResolvedValue({
      data: { convenio_id: "convenio-123" },
      error: null,
    });

    const mockEq = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: { estado: "error", error_message: "Processing failed" },
        error: null,
      }),
    });

    const mockSelect = vi.fn().mockReturnValue({
      eq: mockEq,
    });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });

    const onError = vi.fn();
    const { result } = renderHook(() =>
      useConvenioUpload({ onError, pollingIntervalMs: 50 })
    );

    await act(async () => {
      await result.current.confirmUpload(
        "https://example.com/test.pdf",
        "test.pdf",
      );
    });

    // Wait for polling to detect error
    await waitFor(() => {
      expect(result.current.state.status).toBe("error");
    }, { timeout: 1000 });

    expect(onError).toHaveBeenCalledWith("Processing failed");
  });

  it("should reset state and cleanup", async () => {
    const { result } = renderHook(() => useConvenioUpload());

    // Set some state
    await act(async () => {
      result.current.setVisibility("publico");
    });

    expect(result.current.visibility).toBe("publico");

    // Reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.state.status).toBe("idle");
  });

  it("should change visibility setting", () => {
    const { result } = renderHook(() => useConvenioUpload());

    expect(result.current.visibility).toBe("privado");

    act(() => {
      result.current.setVisibility("publico");
    });

    expect(result.current.visibility).toBe("publico");
  });
});
