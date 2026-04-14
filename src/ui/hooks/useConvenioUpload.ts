import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; progress: number; fileName: string }
  | { status: 'validating'; fileName: string }
  | { status: 'preview'; fileName: string; previewData: ConvenioPreviewData }
  | { status: 'processing'; fileName: string; convenioId: string }
  | { status: 'ready'; fileName: string; convenioId: string }
  | { status: 'error'; fileName: string; error: string };

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
    pollingIntervalMs = 10000
  } = options;

  const [state, setState] = useState<UploadState>({ status: 'idle' });
  const [visibility, setVisibility] = useState<'publico' | 'privado'>('privado');
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
    setState({ status: 'idle' });
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    const fileName = file.name;
    abortControllerRef.current = new AbortController();

    try {
      // 1. Subir a Storage
      setState({ status: 'uploading', progress: 0, fileName });

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('No autenticado');

      const filePath = `${user.user.id}/${Date.now()}-${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('convenios-pdf')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      setState({ status: 'uploading', progress: 100, fileName });

      // 2. Obtener URL publica
      const { data: urlData } = supabase.storage
        .from('convenios-pdf')
        .getPublicUrl(filePath);

      // 3. Validar estructura (llamar a edge function de preview)
      setState({ status: 'validating', fileName });

      // Por ahora, extraemos nombre del archivo como preview basico
      const previewData: ConvenioPreviewData = {
        nombre: fileName.replace('.pdf', '').replace(/-/g, ' '),
        paginas: undefined,
        ambito: undefined
      };

      setState({
        status: 'preview',
        fileName,
        previewData
      });

      return { fileUrl: urlData.publicUrl, filePath };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      setState({ status: 'error', fileName, error: message });
      onError?.(message);
      return null;
    }
  }, [onError]);

  const confirmUpload = useCallback(async (fileUrl: string, fileName: string) => {
    try {
      setState({ status: 'validating', fileName });

      // Llamar a Edge Function para iniciar procesamiento
      const { data, error } = await supabase.functions.invoke('upload-convenio', {
        body: {
          file_url: fileUrl,
          nombre_archivo: fileName,
          visibilidad: visibility
        }
      });

      if (error) throw error;

      const { convenio_id } = data;

      setState({ status: 'processing', fileName, convenioId: convenio_id });

      // Iniciar polling para verificar estado
      pollingRef.current = setInterval(async () => {
        const { data: convenio, error: pollError } = await supabase
          .from('convenios')
          .select('estado, error_message')
          .eq('id', convenio_id)
          .single();

        if (pollError) return;

        if (convenio.estado === 'activo') {
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
          setState({ status: 'ready', fileName, convenioId: convenio_id });
          onSuccess?.(convenio_id);
        } else if (convenio.estado === 'error') {
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
          setState({
            status: 'error',
            fileName,
            error: convenio.error_message || 'Error procesando convenio'
          });
          onError?.(convenio.error_message || 'Error procesando convenio');
        }
      }, pollingIntervalMs);

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      setState({ status: 'error', fileName, error: message });
      onError?.(message);
    }
  }, [visibility, pollingIntervalMs, onSuccess, onError]);

  return {
    state,
    visibility,
    setVisibility,
    uploadFile,
    confirmUpload,
    reset
  };
}
