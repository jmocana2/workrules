import { useState } from 'react';
import { DropZone } from './DropZone';
import { UploadProgress } from './UploadProgress';
import { ConvenioPreview } from './ConvenioPreview';
import { VisibilitySelector } from './VisibilitySelector';
import { useConvenioUpload } from '@/ui/hooks/useConvenioUpload';

interface ConvenioUploaderProps {
  isPremium?: boolean;
  onConvenioReady?: (convenioId: string) => void;
}

export function ConvenioUploader({
  isPremium = false,
  onConvenioReady
}: ConvenioUploaderProps) {
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
      // Reset despues de 3 segundos de mostrar "ready"
      setTimeout(reset, 3000);
    }
  });

  // No renderizar si no es premium
  if (!isPremium) return null;

  const handleFileSelect = async (file: File) => {
    const result = await uploadFile(file);
    if (result) {
      setPendingUpload({
        fileUrl: result.fileUrl,
        fileName: file.name
      });
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
        <DropZone onFileSelect={handleFileSelect} />
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
