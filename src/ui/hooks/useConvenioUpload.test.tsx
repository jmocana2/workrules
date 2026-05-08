import { supabase } from "@/lib/supabase";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { type ReactNode } from "react";
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

// Create QueryClient wrapper for tests
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useConvenioUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("should start in idle state", () => {
    const { result } = renderHook(() => useConvenioUpload(), {
      wrapper: createWrapper(),
    });
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

    // Mock createSignedUrl (instead of getPublicUrl)
    const mockCreateSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: "https://example.com/test.pdf?token=abc123" },
      error: null,
    });

    (supabase.storage.from as any).mockReturnValue({
      createSignedUrl: mockCreateSignedUrl,
    });

    const { result } = renderHook(() => useConvenioUpload(), {
      wrapper: createWrapper(),
    });

    const file = new File(["test"], "test.pdf", { type: "application/pdf" });

    let uploadResult;
    await act(async () => {
      uploadResult = await result.current.uploadFile(file);
    });

    expect(result.current.state.status).toBe("preview");
    expect(uploadResult).toEqual({
      fileUrl: "https://example.com/test.pdf?token=abc123",
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
    const { result } = renderHook(() => useConvenioUpload({ onError }), {
      wrapper: createWrapper(),
    });

    const file = new File(["test"], "test.pdf", { type: "application/pdf" });

    await act(async () => {
      await result.current.uploadFile(file);
    });

    expect(result.current.state.status).toBe("error");
    expect(onError).toHaveBeenCalledWith(expect.any(String));
  });

  it("should confirm upload and start polling", async () => {
    // Use fake timers to control setTimeout
    vi.useFakeTimers();

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
    const { result } = renderHook(
      () => useConvenioUpload({ onSuccess, pollingIntervalMs: 50 }),
      {
        wrapper: createWrapper(),
      }
    );

    await act(async () => {
      await result.current.confirmUpload(
        "https://example.com/test.pdf",
        "test.pdf",
      );
    });

    expect(result.current.state.status).toBe("processing");
    if (result.current.state.status === "processing") {
      expect(result.current.state.progress).toBe(0);
      expect(result.current.state.estimatedTimeLeft).toBe(150);
    }

    // Advance timers to trigger polling
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // Should transition to 100% processing
    expect(result.current.state.status).toBe("processing");
    if (result.current.state.status === "processing") {
      expect(result.current.state.progress).toBe(100);
    }

    // Advance timers past the 800ms transition
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900);
    });

    // Now should be ready
    expect(result.current.state.status).toBe("ready");
    expect(onSuccess).toHaveBeenCalledWith("convenio-123");

    vi.useRealTimers();
  });

  it("should handle processing errors", async () => {
    vi.useFakeTimers();

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
    const { result } = renderHook(
      () => useConvenioUpload({ onError, pollingIntervalMs: 50 }),
      {
        wrapper: createWrapper(),
      }
    );

    await act(async () => {
      await result.current.confirmUpload(
        "https://example.com/test.pdf",
        "test.pdf",
      );
    });

    // Advance timers to trigger polling
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // Should detect error
    expect(result.current.state.status).toBe("error");
    expect(onError).toHaveBeenCalledWith("Processing failed");

    vi.useRealTimers();
  });

  it("should reset state and cleanup", async () => {
    const { result } = renderHook(() => useConvenioUpload(), {
      wrapper: createWrapper(),
    });

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
    const { result } = renderHook(() => useConvenioUpload(), {
      wrapper: createWrapper(),
    });

    expect(result.current.visibility).toBe("privado");

    act(() => {
      result.current.setVisibility("publico");
    });

    expect(result.current.visibility).toBe("publico");
  });
});
