import { useConvenioUpload } from '@/ui/hooks/useConvenioUpload';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ConvenioPreview } from './ConvenioPreview';
import { DropZone } from './DropZone';
import { UploadProgress } from './UploadProgress';
import { VisibilitySelector } from './VisibilitySelector';

export interface ConvenioUploaderController {
  state: ReturnType<typeof useConvenioUpload>['state'];
  visibility: ReturnType<typeof useConvenioUpload>['visibility'];
  setVisibility: ReturnType<typeof useConvenioUpload>['setVisibility'];
  isUploading: boolean;
  uploadErrorMessage: string | null;
  handleFileSelect: (file: File) => Promise<void>;
  handleConfirm: () => void;
  handleCancel: () => void;
  reset: () => void;
}

interface ConvenioUploaderProps {
  isPremium?: boolean;
  onConvenioReady?: (convenioId: string) => void;
  // Modo controlado: el padre instancia el hook y posee el estado. Necesario para que
  // el upload sobreviva al desmontaje del componente (p.ej. cambio de breakpoint en
  // rotación de móvil que remonta el Sidebar contenedor).
  controller?: ConvenioUploaderController;
}

export interface ConvenioUploaderRef {
  handleFileSelect: (file: File) => Promise<void>;
}

export const ConvenioUploader = forwardRef<ConvenioUploaderRef, ConvenioUploaderProps>(
  function ConvenioUploader({ isPremium = false, onConvenioReady, controller }, ref) {
  if (!isPremium) return null;
  if (controller) {
    return <ControlledUploader controller={controller} forwardedRef={ref} />;
  }
  return <UncontrolledUploader onConvenioReady={onConvenioReady} forwardedRef={ref} />;
});

function ControlledUploader({
  controller,
  forwardedRef,
}: {
  controller: ConvenioUploaderController;
  forwardedRef: React.ForwardedRef<ConvenioUploaderRef>;
}) {
  useImperativeHandle(forwardedRef, () => ({
    handleFileSelect: controller.handleFileSelect,
  }), [controller.handleFileSelect]);
  return <UploaderView controller={controller} />;
}

function UncontrolledUploader({
  onConvenioReady,
  forwardedRef,
}: {
  onConvenioReady?: (convenioId: string) => void;
  forwardedRef: React.ForwardedRef<ConvenioUploaderRef>;
}) {
  const controller = useInternalController({ onConvenioReady });
  useImperativeHandle(forwardedRef, () => ({
    handleFileSelect: controller.handleFileSelect,
  }), [controller.handleFileSelect]);
  return <UploaderView controller={controller} />;
}

function UploaderView({ controller }: { controller: ConvenioUploaderController }) {
  const {
    state, visibility, setVisibility, isUploading, uploadErrorMessage,
    handleFileSelect, handleConfirm, handleCancel, reset,
  } = controller;

  return (
    <div className="space-y-3">
      {state.status === 'idle' && (
        <DropZone
          onFileSelect={handleFileSelect}
          disabled={isUploading}
        />
      )}

      {uploadErrorMessage && state.status === 'idle' && (
        <div role="alert" className="px-3 py-2 rounded-md border border-(--colorsSemanticError9) bg-(--colorsSemanticErrorAlpha3)">
          <p className="text-sm text-(--colorsSemanticError11)">{uploadErrorMessage}</p>
        </div>
      )}
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
          processingProgress={state.status === 'processing' ? state.progress : undefined}
          stageLabel={state.status === 'processing' ? state.stageLabel : undefined}
        />
      )}

      {state.status === 'ready' && state.partial && (
        <div
          role="status"
          className="px-3 py-2 rounded-md border border-(--colorsSemanticWarning9) bg-(--colorsSemanticWarningAlpha3)"
        >
          <p className="text-sm text-(--colorsSemanticWarning11)">
            El convenio se ha indexado pero no se pudo extraer su perfil completo. Podrás consultarlo en el chat, pero la calculadora salarial no estará disponible para este convenio.
          </p>
        </div>
      )}

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

      {state.status === 'error' && (
        <button
          onClick={reset}
          className="w-full px-3 py-2 text-sm rounded-md
            border border-(--colorsNeutralNeutral6)
            text-(--colorsNeutralNeutral11)
            hover:bg-(--colorsNeutralNeutral3)"
        >
          Intentar de nuevo
        </button>
      )}
    </div>
  );
}

export function useConvenioUploaderController({
  onConvenioReady,
}: {
  onConvenioReady?: (convenioId: string) => void;
} = {}): ConvenioUploaderController {
  return useInternalController({ onConvenioReady });
}

function useInternalController({
  onConvenioReady,
}: {
  onConvenioReady?: (convenioId: string) => void;
}): ConvenioUploaderController {
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadErrorMessage, setUploadErrorMessage] = useState<string | null>(null);
  const [pendingUpload, setPendingUpload] = useState<{
    fileUrl: string;
    filePath: string;
    fileName: string;
  } | null>(null);

  const { state, visibility, setVisibility, uploadFile, confirmUpload, reset } = useConvenioUpload({
    onSuccess: (convenioId) => {
      onConvenioReady?.(convenioId);
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
      resetTimeoutRef.current = setTimeout(() => {
        reset();
        resetTimeoutRef.current = null;
      }, 3000);
    },
  });

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
        resetTimeoutRef.current = null;
      }
    };
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    setUploadErrorMessage(null);
    setIsUploading(true);
    try {
      const result = await uploadFile(file);
      if (result) {
        setPendingUpload({
          fileUrl: result.fileUrl,
          filePath: result.filePath,
          fileName: file.name,
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
  }, [uploadFile]);

  const handleConfirm = useCallback(() => {
    if (pendingUpload) {
      confirmUpload(pendingUpload.fileUrl, pendingUpload.filePath, pendingUpload.fileName);
      setPendingUpload(null);
    }
  }, [confirmUpload, pendingUpload]);

  const handleCancel = useCallback(() => {
    reset();
    setPendingUpload(null);
  }, [reset]);

  return {
    state,
    visibility,
    setVisibility,
    isUploading,
    uploadErrorMessage,
    handleFileSelect,
    handleConfirm,
    handleCancel,
    reset,
  };
}

export default ConvenioUploader;
