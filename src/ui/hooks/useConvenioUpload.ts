import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Calcula el hash SHA-256 de un archivo
 * @param file - Archivo a hashear
 * @returns Hash SHA-256 en formato hexadecimal (64 caracteres)
 */
async function calculateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

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
  const {
    onSuccess,
    onError,
    pollingIntervalMs = 10000,
  } = options;

  const queryClient = useQueryClient();
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

  const uploadFile = useCallback(async (file: File) => {
    const fileName = file.name;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // 1. Calcular hash del archivo para detección de duplicados
      // Mostrar estado "validating" mientras se calcula el hash (1-2s para archivos grandes)
      // Mejora UX vs mostrar "Subiendo 0%" durante el cálculo
      setState({ status: "validating", fileName });
      const fileHash = await calculateFileHash(file);
      fileHashRef.current = fileHash;

      // 2. Subir a Storage
      setState({ status: "uploading", progress: 0, fileName });

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("No autenticado");

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Sesión expirada. Inicia sesión de nuevo.");
      }

      const filePath = `${user.user.id}/${Date.now()}-${fileName}`;
      const encodedFilePath = filePath
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");

      const uploadResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/convenios-pdf/${encodedFilePath}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "cache-control": "3600",
            "x-upsert": "false",
            "Content-Type": file.type || "application/pdf",
          },
          body: file,
          signal: controller.signal,
        },
      );

      if (!uploadResponse.ok) {
        let uploadMessage = "Error subiendo archivo";
        try {
          const errorBody = await uploadResponse.json();
          uploadMessage = errorBody?.message || errorBody?.error ||
            uploadMessage;
        } catch {
          uploadMessage = `${uploadMessage} (${uploadResponse.status})`;
        }
        throw new Error(uploadMessage);
      }

      setState({ status: "uploading", progress: 100, fileName });

      // 2. Obtener URL firmada (signed URL) válida por 1 hora
      const { data: urlData, error: urlError } = await supabase.storage
        .from("convenios-pdf")
        .createSignedUrl(filePath, 3600); // 3600 segundos = 1 hora

      if (urlError) throw urlError;

      // 3. Validar estructura (llamar a edge function de preview)
      setState({ status: "validating", fileName });

      // Por ahora, extraemos nombre del archivo como preview basico
      const previewData: ConvenioPreviewData = {
        nombre: fileName.replace(".pdf", "").replace(/-/g, " "),
        paginas: undefined,
        ambito: undefined,
      };

      setState({
        status: "preview",
        fileName,
        previewData,
      });

      return { fileUrl: urlData.signedUrl, filePath };
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

      const message = error instanceof Error
        ? error.message
        : "Error desconocido";
      setState({ status: "error", fileName, error: message });
      onError?.(message);
      return null;
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [onError]);

  const confirmUpload = useCallback(
    async (fileUrl: string, fileName: string) => {
      try {
        setState({ status: "validating", fileName });

        // Llamar a Edge Function para iniciar procesamiento
        const { data, error } = await supabase.functions.invoke(
          "upload-convenio",
          {
            body: {
              file_url: fileUrl,
              nombre_archivo: fileName,
              visibilidad: visibility,
              pdf_hash: fileHashRef.current,
            },
          },
        );

        if (error) throw error;

        // Verificar si es duplicado (status 409)
        if (data?.status === "duplicate") {
          const existingName = data.existing_convenio?.nombre || "desconocido";
          throw new Error(
            `Ya tienes un convenio con este PDF: "${existingName}". No es necesario subirlo de nuevo.`,
          );
        }

        const convenio_id = data?.convenio_id;
        if (!convenio_id) {
          throw new Error("Respuesta inválida del servidor: falta convenio_id");
        }

        // Progreso real: leemos convenio_processing_status (alimentada por n8n).
        // Si todavía no hay fila (n8n no ha emitido el primer evento), mostramos 0% queued.
        setState({
          status: "processing",
          fileName,
          convenioId: convenio_id,
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
            convenioId: convenio_id,
            progress: 100,
            stage: "completed",
            stageLabel: STAGE_LABELS.completed,
          });
          completionTimeoutRef.current = setTimeout(() => {
            stopPolling({
              status: "ready",
              fileName,
              convenioId: convenio_id,
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

          // Consultamos estado final + progreso en paralelo.
          const [convenioRes, progressRes] = await Promise.all([
            supabase
              .from("convenios")
              .select("estado, error_message")
              .eq("id", convenio_id)
              .single(),
            supabase
              .from("convenio_processing_status")
              .select("stage, progress, message")
              .eq("convenio_id", convenio_id)
              .maybeSingle(),
          ]);

          if (convenioRes.error) {
            const message = convenioRes.error.message || "Error consultando estado";
            stopPolling({ status: "error", fileName, error: message }, message);
            return;
          }

          const estado = convenioRes.data.estado as string;

          if (estado === "activo") {
            finalize(false);
            return;
          }
          if (estado === "activo_sin_perfil") {
            finalize(true);
            return;
          }
          if (estado === "error") {
            const message = convenioRes.data.error_message ||
              "Error procesando convenio";
            stopPolling({ status: "error", fileName, error: message }, message);
            return;
          }
          if (estado === "rechazado") {
            const message = convenioRes.data.error_message ||
              "El documento ha sido rechazado por el validador automático.";
            stopPolling({ status: "error", fileName, error: message }, message);
            return;
          }

          // Aún procesando: aplicar el progreso real si está disponible.
          // No retrocedemos el valor mostrado: si el drift ya pasó al hito real
          // mientras esperábamos el evento, mantenemos el valor derivado.
          const progressRow = progressRes.data;
          if (progressRow) {
            const stage = String(progressRow.stage);
            const realProgress = Math.min(
              95,
              Number(progressRow.progress) || 0,
            );
            setState((prev) =>
              prev.status === "processing"
                ? {
                  ...prev,
                  progress: Math.max(prev.progress, realProgress),
                  stage,
                  stageLabel: progressRow.message ||
                    STAGE_LABELS[stage] || stage,
                }
                : prev
            );
          }
        }, pollingIntervalMs);
      } catch (error) {
        const message = error instanceof Error
          ? error.message
          : "Error desconocido";
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
