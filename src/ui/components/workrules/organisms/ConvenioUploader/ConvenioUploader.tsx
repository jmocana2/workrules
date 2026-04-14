import { useConvenioUpload } from '@/ui/hooks/useConvenioUpload';
import { useEffect, useRef, useState } from 'react';
import { ConvenioPreview } from './ConvenioPreview';
import { DropZone } from './DropZone';
import { UploadProgress } from './UploadProgress';
import { VisibilitySelector } from './VisibilitySelector';

interface ConvenioUploaderProps {
  isPremium?: boolean;
  onConvenioReady?: (convenioId: string) => void;
}

export function ConvenioUploader({
  isPremium = false,
  onConvenioReady
}: ConvenioUploaderProps) {
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadErrorMessage, setUploadErrorMessage] = useState<string | null>(null);
  const [pendingUpload, setPendingUpload] = useState<{
    fileUrl: string;
    fileName: string;
  } | null>(null);

  const {
    state,
    visibility,
    setVisibility,
    uploadFile,
    confirmUpload,
    reset
  } = useConvenioUpload({
    onSuccess: (convenioId) => {
      onConvenioReady?.(convenioId);
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
      // Reset despues de 3 segundos de mostrar "ready"
      resetTimeoutRef.current = setTimeout(() => {
        reset();
        resetTimeoutRef.current = null;
      }, 3000);
    }
  });

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
        resetTimeoutRef.current = null;
      }
    };
  }, []);

  // No renderizar si no es premium
  if (!isPremium) return null;

  const handleFileSelect = async (file: File) => {
    setUploadErrorMessage(null);
    setIsUploading(true);

    try {
      const result = await uploadFile(file);
      if (result) {
        setPendingUpload({
          fileUrl: result.fileUrl,
          fileName: file.name
        });
      } else {
        setUploadErrorMessage('No se pudo completar la subida. Intentalo de nuevo.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error inesperado al subir archivo';
      console.error('Error en handleFileSelect', error);
      setUploadErrorMessage(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirm = () => {
    if (pendingUpload) {
      confirmUpload(pendingUpload.fileUrl, pendingUpload.fileName);
      setPendingUpload(null);
    }
  };

  const handleCancel = () => {
    reset();
    setPendingUpload(null);
  };

  return (
    <div className="space-y-3">
      {/* Estado idle: mostrar dropzone */}
      {state.status === 'idle' && (
        <DropZone
          onFileSelect={handleFileSelect}
          disabled={isUploading}
        />
      )}

      {uploadErrorMessage && state.status === 'idle' && (
        <div className="px-3 py-2 rounded-md border border-[var(--colorsSemanticError9)] bg-[var(--colorsSemanticErrorAlpha3)]">
          <p className="text-sm text-[var(--colorsSemanticError11)]">{uploadErrorMessage}</p>
        </div>
      )}

      {/* Estado uploading/validating/processing/ready/error: mostrar progress */}
      {(state.status === 'uploading' ||
        state.status === 'validating' ||
        state.status === 'processing' ||
        state.status === 'ready' ||
        state.status === 'error') && (
        <UploadProgress
          status={state.status}
          progress={state.status === 'uploading' ? state.progress : undefined}
          fileName={state.fileName}
          errorMessage={state.status === 'error' ? state.error : undefined}
          onCancel={state.status !== 'ready' && state.status !== 'error' ? handleCancel : undefined}
        />
      )}

      {/* Estado preview: mostrar preview + visibilidad + botones */}
      {state.status === 'preview' && (
        <>
          <ConvenioPreview
            data={state.previewData}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
          <VisibilitySelector
            value={visibility}
            onChange={setVisibility}
          />
        </>
      )}

      {/* Boton reset si hay error */}
      {state.status === 'error' && (
        <button
          onClick={reset}
          className="w-full px-3 py-2 text-sm rounded-md
            border border-[var(--colorsNeutralNeutral6)]
            text-[var(--colorsNeutralNeutral11)]
            hover:bg-[var(--colorsNeutralNeutral3)]"
        >
          Intentar de nuevo
        </button>
      )}
    </div>
  );
}

export default ConvenioUploader;
