import { cn } from '@/lib/utils';

export type UploadStatus = 'uploading' | 'validating' | 'processing' | 'ready' | 'error';

export interface UploadProgressProps {
  status: UploadStatus;
  progress?: number;
  fileName: string;
  errorMessage?: string;
  onCancel?: () => void;
}

interface StatusConfig {
  label: string;
  icon: string;
  color: string;
}

const STATUS_CONFIG: Record<UploadStatus, StatusConfig> = {
  uploading: {
    label: 'Subiendo...',
    icon: '📤',
    color: 'var(--colorsAccentAccent9)',
  },
  validating: {
    label: 'Validando estructura...',
    icon: '🔍',
    color: 'var(--colorsSemanticInfo9)',
  },
  processing: {
    label: 'Procesando convenio...',
    icon: '⏳',
    color: 'var(--colorsSemanticWarning9)',
  },
  ready: {
    label: 'Listo para consultar',
    icon: '✅',
    color: 'var(--colorsSemanticSuccess9)',
  },
  error: {
    label: 'Error',
    icon: '❌',
    color: 'var(--colorsSemanticError9)',
  },
};

export function UploadProgress({
  status,
  progress = 0,
  fileName,
  errorMessage,
  onCancel,
}: UploadProgressProps) {
  const config = STATUS_CONFIG[status];
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const showCancelButton = onCancel && status !== 'ready' && status !== 'error';
  const showProgressBar = status === 'uploading';
  const showProcessingMessage = status === 'processing';

  return (
    <div
      className={cn(
        'p-4 rounded-lg border',
        'bg-[var(--app-upload-bg)] border-[var(--app-upload-border)]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xl" aria-hidden="true">
            {config.icon}
          </span>
          <span
            className="text-sm font-medium text-[var(--app-upload-filename)] truncate max-w-[150px]"
            title={fileName}
          >
            {fileName}
          </span>
        </div>
        {showCancelButton && (
          <button
            onClick={onCancel}
            className={cn(
              'text-xs text-[var(--app-upload-cancel)] hover:text-[var(--app-upload-cancel-hover)]',
              'transition-colors duration-200'
            )}
            type="button"
          >
            Cancelar
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {showProgressBar && (
        <div
          className="h-2 rounded-full mb-2 overflow-hidden"
          style={{ backgroundColor: 'var(--app-upload-progressbar-bg)' }}
        >
          <div
            className="h-full transition-all duration-300 ease-out"
            style={{
              width: `${clampedProgress}%`,
              backgroundColor: config.color,
            }}
            role="progressbar"
            aria-label={`Progreso de subida de ${fileName}`}
            aria-valuenow={clampedProgress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      )}

      {/* Status Label */}
      <div className="text-sm" style={{ color: config.color }}>
        {status === 'error' && errorMessage ? (
          errorMessage
        ) : (
          <>
            {config.label}
            {status === 'uploading' && ` ${Math.round(progress)}%`}
          </>
        )}
      </div>

      {/* Processing Message */}
      {showProcessingMessage && (
        <p
          className="text-xs mt-2"
          style={{ color: 'var(--app-upload-processing-hint)' }}
        >
          Esto puede tardar unos minutos. Te notificaremos cuando esté listo.        </p>
      )}
    </div>
  );
}
