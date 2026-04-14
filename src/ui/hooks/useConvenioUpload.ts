import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useRef, useState } from "react";

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; progress: number; fileName: string }
  | { status: "validating"; fileName: string }
  | { status: "preview"; fileName: string; previewData: ConvenioPreviewData }
  | { status: "processing"; fileName: string; convenioId: string }
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

  const [state, setState] = useState<UploadState>({ status: "idle" });
  const [visibility, setVisibility] = useState<"publico" | "privado">(
    "privado",
  );
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
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
      // 1. Subir a Storage
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

      // 2. Obtener URL publica
      const { data: urlData } = supabase.storage
        .from("convenios-pdf")
        .getPublicUrl(filePath);

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

      return { fileUrl: urlData.publicUrl, filePath };
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
            },
          },
        );

        if (error) throw error;

        const convenio_id = data?.convenio_id;
        if (!convenio_id) {
          throw new Error("Respuesta inválida del servidor: falta convenio_id");
        }
        setState({ status: "processing", fileName, convenioId: convenio_id });

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

          setState(nextState);

          if (nextState.status === "ready") {
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
            stopPolling({ status: "ready", fileName, convenioId: convenio_id });
          } else if (convenio.estado === "error") {
            const message = convenio.error_message ||
              "Error procesando convenio";
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
    [visibility, pollingIntervalMs, onSuccess, onError],
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
