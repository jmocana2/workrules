import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IConvenioUploadRepository } from "@/application/ports";
import { useConvenioUpload } from "./useConvenioUpload";
import { createTestWrapper } from "./testUtils";

function makeUploadRepo(
  overrides: Partial<IConvenioUploadRepository> = {},
): IConvenioUploadRepository {
  return {
    getUploadIdentity: vi.fn().mockResolvedValue({
      userId: "user-123",
      accessToken: "fake-token",
    }),
    uploadPdf: vi.fn().mockResolvedValue({
      signedUrl: "https://example.com/test.pdf?token=abc123",
      filePath: "user-123/123-test.pdf",
    }),
    confirmUpload: vi.fn().mockResolvedValue({
      status: "started",
      convenioId: "convenio-123",
      existingNombre: null,
    }),
    fetchProcessingStatus: vi.fn().mockResolvedValue({
      estado: "procesando",
      errorMessage: null,
      progressStage: null,
      progressValue: null,
      progressMessage: null,
    }),
    ...overrides,
  };
}

describe("useConvenioUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("should start in idle state", () => {
    const { result } = renderHook(() => useConvenioUpload(), {
      wrapper: createTestWrapper({ convenioUpload: makeUploadRepo() }),
    });
    expect(result.current.state.status).toBe("idle");
  });

  it("should upload file successfully", async () => {
    const repo = makeUploadRepo();

    const { result } = renderHook(() => useConvenioUpload(), {
      wrapper: createTestWrapper({ convenioUpload: repo }),
    });

    const file = new File(["test"], "test.pdf", { type: "application/pdf" });

    let uploadResult: { fileUrl: string; filePath: string } | null = null;
    await act(async () => {
      uploadResult = await result.current.uploadFile(file);
    });

    expect(result.current.state.status).toBe("preview");
    expect(uploadResult).toEqual({
      fileUrl: "https://example.com/test.pdf?token=abc123",
      filePath: "user-123/123-test.pdf",
    });
    expect(repo.getUploadIdentity).toHaveBeenCalled();
    expect(repo.uploadPdf).toHaveBeenCalled();
  });

  it("should handle upload errors", async () => {
    const repo = makeUploadRepo({
      uploadPdf: vi.fn().mockRejectedValue(new Error("Upload failed")),
    });

    const onError = vi.fn();
    const { result } = renderHook(() => useConvenioUpload({ onError }), {
      wrapper: createTestWrapper({ convenioUpload: repo }),
    });

    const file = new File(["test"], "test.pdf", { type: "application/pdf" });

    await act(async () => {
      await result.current.uploadFile(file);
    });

    expect(result.current.state.status).toBe("error");
    expect(onError).toHaveBeenCalledWith(expect.any(String));
  });

  it("should confirm upload and start polling", async () => {
    vi.useFakeTimers();

    const repo = makeUploadRepo({
      fetchProcessingStatus: vi.fn().mockResolvedValue({
        estado: "activo",
        errorMessage: null,
        progressStage: null,
        progressValue: null,
        progressMessage: null,
      }),
    });

    const onSuccess = vi.fn();
    const { result } = renderHook(
      () => useConvenioUpload({ onSuccess, pollingIntervalMs: 50 }),
      {
        wrapper: createTestWrapper({ convenioUpload: repo }),
      },
    );

    await act(async () => {
      await result.current.confirmUpload(
        "https://example.com/test.pdf",
        "user-123/test.pdf",
        "test.pdf",
      );
    });

    expect(result.current.state.status).toBe("processing");
    if (result.current.state.status === "processing") {
      expect(result.current.state.progress).toBe(0);
      expect(result.current.state.stage).toBe("queued");
    }

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(result.current.state.status).toBe("processing");
    if (result.current.state.status === "processing") {
      expect(result.current.state.progress).toBe(100);
    }

    await act(async () => {
      await vi.advanceTimersByTimeAsync(900);
    });

    expect(result.current.state.status).toBe("ready");
    expect(onSuccess).toHaveBeenCalledWith("convenio-123");

    vi.useRealTimers();
  });

  it("should handle processing errors", async () => {
    vi.useFakeTimers();

    const repo = makeUploadRepo({
      fetchProcessingStatus: vi.fn().mockResolvedValue({
        estado: "error",
        errorMessage: "Processing failed",
        progressStage: null,
        progressValue: null,
        progressMessage: null,
      }),
    });

    const onError = vi.fn();
    const { result } = renderHook(
      () => useConvenioUpload({ onError, pollingIntervalMs: 50 }),
      {
        wrapper: createTestWrapper({ convenioUpload: repo }),
      },
    );

    await act(async () => {
      await result.current.confirmUpload(
        "https://example.com/test.pdf",
        "user-123/test.pdf",
        "test.pdf",
      );
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(result.current.state.status).toBe("error");
    expect(onError).toHaveBeenCalledWith("Processing failed");

    vi.useRealTimers();
  });

  it("should reset state and cleanup", async () => {
    const { result } = renderHook(() => useConvenioUpload(), {
      wrapper: createTestWrapper({ convenioUpload: makeUploadRepo() }),
    });

    await act(async () => {
      result.current.setVisibility("publico");
    });

    expect(result.current.visibility).toBe("publico");

    act(() => {
      result.current.reset();
    });

    expect(result.current.state.status).toBe("idle");
  });

  it("should change visibility setting", () => {
    const { result } = renderHook(() => useConvenioUpload(), {
      wrapper: createTestWrapper({ convenioUpload: makeUploadRepo() }),
    });

    expect(result.current.visibility).toBe("privado");

    act(() => {
      result.current.setVisibility("publico");
    });

    expect(result.current.visibility).toBe("publico");
  });
});
