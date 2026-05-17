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

// TODO: Implementar sistema de progreso real basado en eventos
// ============================================================
// PROBLEMA ACTUAL: El progreso es estimado (curva logarítmica de ~2.5 min)
// Si n8n tarda más o menos, el progreso no será preciso.
//
// SOLUCIÓN PROPUESTA:
// 1. Modificar n8n para enviar eventos de progreso a través de webhooks
// 2. Crear edge function "webhook-progress" que reciba eventos de n8n:
//    POST /functions/v1/webhook-progress
//    { convenio_id, stage, progress, message }
//
// 3. Guardar progreso en tabla temporal "convenio_processing_status":
//    CREATE TABLE convenio_processing_status (
//      convenio_id UUID PRIMARY KEY,
//      stage TEXT, -- 'parsing', 'chunking', 'embedding', 'profile'
//      progress INT, -- 0-100
//      message TEXT,
//      updated_at TIMESTAMP
//    );
//
// 4. El polling consulta esta tabla además del estado del convenio
// 5. n8n envía eventos en cada etapa:
//    - 20%: LlamaParse completado
//    - 40%: Markdown limpiado y guardado
//    - 60%: Chunks generados e insertados
//    - 80%: Claude perfil extraído
//    - 90%: Embeddings generados
//    - 100%: Todo completado (estado = "activo")
//
// BENEFICIOS:
// - Progreso preciso en tiempo real
// - Usuario sabe exactamente en qué etapa está
// - Mejor UX si hay errores en etapas intermedias
// ============================================================

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
    estimatedTimeLeft: number;
  }
  | { status: "ready"; fileName: string; convenioId: string }
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
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const completionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileHashRef = useRef<string | null>(null);

  const reset = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (progressRef.current) {
      clearInterval(progressRef.current);
      progressRef.current = null;
    }
    if (completionTimeoutRef.current) {
      clearTimeout(completionTimeoutRef.current);
      completionTimeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    fileHashRef.current = null;
    setState({ status: "idle" });
  }, []);

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

        // TODO: Implementar progreso real basado en webhooks de n8n
        // Actualmente usa estimación basada en tiempo (~2.5 min promedio)
        // Mejora futura: n8n podría enviar eventos de progreso:
        //   - 20%: LlamaParse completado
        //   - 50%: Chunks generados
        //   - 70%: Claude perfil extraído
        //   - 90%: Embeddings generados
        //   - 100%: Todo completado

        // Iniciar progreso estimado
        const ESTIMATED_TOTAL_TIME = 60; // 1 minuto (tras optimizaciones del indexer, tiempo real ~55s)
        const PROGRESS_UPDATE_INTERVAL = 1000; // Actualizar cada 1 segundo
        let elapsedSeconds = 0;

        setState({
          status: "processing",
          fileName,
          convenioId: convenio_id,
          progress: 0,
          estimatedTimeLeft: ESTIMATED_TOTAL_TIME,
        });

        // Simular progreso con curva logarítmica (más rápida al inicio, más lenta al final)
        // Llega al 90% alrededor de los 2 minutos
        progressRef.current = setInterval(() => {
          elapsedSeconds += 1;
          const maxProgress = 90; // Nunca llegar a 100% hasta que termine realmente

          // Curva logarítmica: progreso rápido al inicio, lento al final
          // Llega a ~50% en 1 min, ~80% en 2 min, ~90% en 2.5 min
          const normalizedTime = elapsedSeconds / ESTIMATED_TOTAL_TIME; // 0 a 1
          const estimatedProgress = Math.min(
            maxProgress,
            maxProgress * (1 - Math.exp(-3 * normalizedTime)),
          );
          const timeLeft = Math.max(0, ESTIMATED_TOTAL_TIME - elapsedSeconds);

          setState((prev) =>
            prev.status === "processing"
              ? {
                ...prev,
                progress: Math.round(estimatedProgress),
                estimatedTimeLeft: timeLeft,
              }
              : prev
          );
        }, PROGRESS_UPDATE_INTERVAL);

        // Iniciar polling para verificar estado
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

          if (progressRef.current) {
            clearInterval(progressRef.current);
            progressRef.current = null;
          }

          setState(nextState);

          if (nextState.status === "ready") {
            // Invalidar la caché de convenios para que se recargue la lista
            queryClient.invalidateQueries({ queryKey: ["convenios"] });
            onSuccess?.(nextState.convenioId);
          }

          if (errorMessage) {
            onError?.(errorMessage);
          }
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

          const { data: convenio, error: pollError } = await supabase
            .from("convenios")
            .select("estado, error_message")
            .eq("id", convenio_id)
            .single();

          if (pollError) {
            const message = pollError.message || "Error consultando estado";
            stopPolling({ status: "error", fileName, error: message }, message);
            return;
          }

          if (convenio.estado === "activo") {
            // Detener el progreso simulado
            if (progressRef.current) {
              clearInterval(progressRef.current);
              progressRef.current = null;
            }

            // Primero completar la barra al 100%
            setState({
              status: "processing",
              fileName,
              convenioId: convenio_id,
              progress: 100,
              estimatedTimeLeft: 0,
            });

            // Esperar 800ms para mostrar la barra completa, luego cambiar a "ready"
            completionTimeoutRef.current = setTimeout(() => {
              stopPolling({
                status: "ready",
                fileName,
                convenioId: convenio_id,
              });
              completionTimeoutRef.current = null;
            }, 800);
          } else if (convenio.estado === "error") {
            const message = convenio.error_message ||
              "Error procesando convenio";
            stopPolling({ status: "error", fileName, error: message }, message);
          } else if (convenio.estado === "rechazado") {
            const message = convenio.error_message ||
              "El documento ha sido rechazado por el validador automático.";
            stopPolling({ status: "error", fileName, error: message }, message);
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
    [visibility, pollingIntervalMs, onSuccess, onError, queryClient],
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
