import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  calculateFileHash,
  confirmConvenioUpload,
  fetchConvenioProcessingStatus,
  getUploadIdentity,
  uploadConvenioPdf,
} from "@/application/use-cases";
import { useRepositories } from "@/providers/RepositoriesProvider";

// Progreso real basado en eventos: n8n envía POST a /functions/v1/webhook-progress
// que escribe en la tabla convenio_processing_status. El hook lee esa tabla en cada poll.
// Etapas (stage, progress): parsing 20 → saving_markdown 40 → chunking 60 → profile 80 → completed 100.

const STAGE_LABELS: Record<string, string> = {
  queued: "Preparando el convenio…",
  downloading: "Recibiendo el documento…",
  parsing: "Leyendo el contenido del PDF…",
  classifying: "Comprobando que es un convenio…",
  saving_markdown: "Guardando el contenido…",
  chunking: "Organizando la información…",
  embedding: "Analizando el texto…",
  profile: "Extrayendo los datos del convenio…",
  completed: "¡Listo!",
  failed: "Algo ha ido mal",
};

// Techo al que el drift puede aproximarse mientras esperamos el siguiente
// evento real de n8n. Cuando llega ese evento, el progreso salta al valor real
// y empieza a derivar hacia el techo de la siguiente etapa.
const STAGE_CEILING: Record<string, number> = {
  queued: 15,
  downloading: 18,
  parsing: 35,
  classifying: 38,
  saving_markdown: 55,
  chunking: 75,
  embedding: 78,
  profile: 95,
  completed: 100,
};
const DRIFT_INTERVAL_MS = 500;
const DRIFT_STEP = 0.3;

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; progress: number; fileName: string }
  | { status: "validating"; fileName: string }
  | { status: "preview"; fileName: string; previewData: ConvenioPreviewData }
  | {
      status: "processing";
      fileName: string;
      convenioId: string;
      progress: number;
      stage: string;
      stageLabel: string;
    }
  | { status: "ready"; fileName: string; convenioId: string; partial?: boolean }
  | { status: "error"; fileName: string; error: string };

interface ConvenioPreviewData {
  nombre: string;
  ambito?: string;
  paginas?: number;
}

interface UseConvenioUploadOptions {
  onSuccess?: (convenioId: string) => void;
  onError?: (error: string) => void;
  pollingIntervalMs?: number;
}

export function useConvenioUpload(options: UseConvenioUploadOptions = {}) {
  const { onSuccess, onError, pollingIntervalMs = 10000 } = options;

  const queryClient = useQueryClient();
  const { convenioUpload } = useRepositories();
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const [visibility, setVisibility] = useState<"publico" | "privado">(
    "privado",
  );
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const completionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const driftRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileHashRef = useRef<string | null>(null);

  const stopDrift = useCallback(() => {
    if (driftRef.current) {
      clearInterval(driftRef.current);
      driftRef.current = null;
    }
  }, []);

  const startDrift = useCallback(() => {
    stopDrift();
    driftRef.current = setInterval(() => {
      setState((prev) => {
        if (prev.status !== "processing") return prev;
        const ceiling = STAGE_CEILING[prev.stage] ?? 95;
        if (prev.progress >= ceiling) return prev;
        const next = Math.min(ceiling, prev.progress + DRIFT_STEP);
        return { ...prev, progress: next };
      });
    }, DRIFT_INTERVAL_MS);
  }, [stopDrift]);

  const reset = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (completionTimeoutRef.current) {
      clearTimeout(completionTimeoutRef.current);
      completionTimeoutRef.current = null;
    }
    stopDrift();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    fileHashRef.current = null;
    setState({ status: "idle" });
  }, [stopDrift]);

  useEffect(() => {
    return () => {
      reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadFile = useCallback(
    async (file: File) => {
      const fileName = file.name;
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        // 1. Hash para deteccion de duplicados (1-2s en archivos grandes -> mostramos validating)
        setState({ status: "validating", fileName });
        const fileHash = await calculateFileHash(file);
        fileHashRef.current = fileHash;

        setState({ status: "uploading", progress: 0, fileName });

        const identity = await getUploadIdentity({ repo: convenioUpload });
        if (!identity) {
          throw new Error("Sesión expirada. Inicia sesión de nuevo.");
        }

        const { signedUrl, filePath } = await uploadConvenioPdf(
          { file, identity, signal: controller.signal },
          { repo: convenioUpload },
        );

        setState({ status: "uploading", progress: 100, fileName });

        // Preview básico: nombre extraído del archivo
        const previewData: ConvenioPreviewData = {
          nombre: fileName.replace(".pdf", "").replace(/-/g, " "),
          paginas: undefined,
          ambito: undefined,
        };

        setState({ status: "preview", fileName, previewData });

        // fileUrl (signed, 1h) viaja solo a n8n para que descargue el PDF una vez.
        // filePath es lo que se persiste en convenios.url_pdf para firmar bajo demanda.
        return { fileUrl: signedUrl, filePath };
      } catch (error) {
        if (
          (error instanceof DOMException && error.name === "AbortError") ||
          (error instanceof Error &&
            (error.name === "AbortError" ||
              error.message.toLowerCase().includes("abort")))
        ) {
          const message = "Subida cancelada";
          setState({ status: "error", fileName, error: message });
          onError?.(message);
          return null;
        }

        const message =
          error instanceof Error ? error.message : "Error desconocido";
        setState({ status: "error", fileName, error: message });
        onError?.(message);
        return null;
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [convenioUpload, onError],
  );

  const confirmUpload = useCallback(
    async (fileUrl: string, filePath: string, fileName: string) => {
      try {
        setState({ status: "validating", fileName });

        const { convenioId } = await confirmConvenioUpload(
          {
            fileUrl,
            filePath,
            nombreArchivo: fileName,
            visibilidad: visibility,
            pdfHash: fileHashRef.current,
          },
          { repo: convenioUpload },
        );

        // Progreso real: leemos convenio_processing_status (alimentada por n8n).
        // Si todavía no hay fila (n8n no ha emitido el primer evento), mostramos 0% queued.
        setState({
          status: "processing",
          fileName,
          convenioId,
          progress: 0,
          stage: "queued",
          stageLabel: STAGE_LABELS.queued,
        });
        // Drift: avanza poco a poco hacia el techo de la etapa actual entre eventos
        // reales para dar sensación de continuidad cuando los hitos de n8n llegan
        // espaciados (parsing 20 → saving_markdown 40 → chunking 60 → profile 80).
        startDrift();

        let attempts = 0;
        const maxAttempts = Math.max(
          1,
          Math.ceil((10 * 60 * 1000) / pollingIntervalMs),
        );

        const stopPolling = (nextState: UploadState, errorMessage?: string) => {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          stopDrift();

          setState(nextState);

          if (nextState.status === "ready") {
            queryClient.invalidateQueries({ queryKey: ["convenios"] });
            onSuccess?.(nextState.convenioId);
          }

          if (errorMessage) {
            onError?.(errorMessage);
          }
        };

        const finalize = (partial: boolean) => {
          stopDrift();
          setState({
            status: "processing",
            fileName,
            convenioId,
            progress: 100,
            stage: "completed",
            stageLabel: STAGE_LABELS.completed,
          });
          completionTimeoutRef.current = setTimeout(() => {
            stopPolling({
              status: "ready",
              fileName,
              convenioId,
              partial,
            });
            completionTimeoutRef.current = null;
          }, 800);
        };

        pollingRef.current = setInterval(async () => {
          attempts += 1;

          if (attempts >= maxAttempts) {
            const timeoutMessage =
              "El procesamiento está tardando más de lo esperado. Inténtalo de nuevo en unos minutos.";
            stopPolling(
              { status: "error", fileName, error: timeoutMessage },
              timeoutMessage,
            );
            return;
          }

          let status;
          try {
            status = await fetchConvenioProcessingStatus(convenioId, {
              repo: convenioUpload,
            });
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Error consultando estado";
            stopPolling({ status: "error", fileName, error: message }, message);
            return;
          }

          if (status.estado === "activo") {
            finalize(false);
            return;
          }
          if (status.estado === "activo_sin_perfil") {
            finalize(true);
            return;
          }
          if (status.estado === "error") {
            const message = status.errorMessage || "Error procesando convenio";
            stopPolling({ status: "error", fileName, error: message }, message);
            return;
          }
          if (status.estado === "rechazado") {
            const message =
              status.errorMessage ||
              "El documento ha sido rechazado por el validador automático.";
            stopPolling({ status: "error", fileName, error: message }, message);
            return;
          }

          // Aún procesando: aplicar el progreso real si está disponible.
          // No retrocedemos el valor mostrado: si el drift ya pasó al hito real
          // mientras esperábamos el evento, mantenemos el valor derivado.
          if (status.progressStage !== null && status.progressValue !== null) {
            const stage = status.progressStage;
            const realProgress = Math.min(95, status.progressValue);
            setState((prev) =>
              prev.status === "processing"
                ? {
                    ...prev,
                    progress: Math.max(prev.progress, realProgress),
                    stage,
                    stageLabel:
                      status.progressMessage || STAGE_LABELS[stage] || stage,
                  }
                : prev,
            );
          }
        }, pollingIntervalMs);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Error desconocido";
        setState({ status: "error", fileName, error: message });
        onError?.(message);
      }
    },
    [
      visibility,
      pollingIntervalMs,
      onSuccess,
      onError,
      queryClient,
      startDrift,
      stopDrift,
      convenioUpload,
    ],
  );

  return {
    state,
    visibility,
    setVisibility,
    uploadFile,
    confirmUpload,
    reset,
  };
}
