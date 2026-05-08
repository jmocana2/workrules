import { cn } from '@/lib/utils';
import { Upload, Search, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type UploadStatus = 'uploading' | 'validating' | 'processing' | 'ready' | 'error';

function formatTimeLeft(seconds: number): string {
  if (seconds <= 0) return 'Finalizando...';

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `~${minutes} min ${remainingSeconds} seg`;
  }
  return `~${remainingSeconds} seg`;
}

export interface UploadProgressProps {
  status: UploadStatus;
  progress?: number;
  fileName: string;
  errorMessage?: string;
  onCancel?: () => void;
  processingProgress?: number;
  estimatedTimeLeft?: number;
}

interface StatusConfig {
  label: string;
  icon: LucideIcon;
  color: string;
}

const STATUS_CONFIG: Record<UploadStatus, StatusConfig> = {
  uploading: {
    label: 'Subiendo...',
    icon: Upload,
    color: 'var(--colorsAccentAccent9)',
  },
  validating: {
    label: 'Validando estructura...',
    icon: Search,
    color: 'var(--colorsAccentAccent9)',
  },
  processing: {
    label: 'Procesando convenio...',
    icon: Loader2,
    color: 'var(--colorsAccentAccent9)',
  },
  ready: {
    label: 'Listo para consultar',
    icon: CheckCircle2,
    color: 'var(--colorsSemanticSuccess9)',
  },
  error: {
    label: 'Error',
    icon: XCircle,
    color: 'var(--colorsSemanticError9)',
  },
};

export function UploadProgress({
  status,
  progress = 0,
  fileName,
  errorMessage,
  onCancel,
  processingProgress = 0,
  estimatedTimeLeft = 0,
}: UploadProgressProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const clampedProcessingProgress = Math.min(100, Math.max(0, processingProgress));
  const showCancelButton = onCancel && status !== 'ready' && status !== 'error';
  const showProgressBar = status === 'uploading' || status === 'processing';
  const showProcessingMessage = status === 'processing';
  const currentProgress = status === 'processing' ? clampedProcessingProgress : clampedProgress;
  const shouldSpin = status === 'processing';
  const shouldPulse = status === 'validating';

  return (
    <div
      className={cn(
        'p-4 rounded-lg border',
        'bg-(--app-upload-bg) border-(--app-upload-border)'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Icon
            className={cn(
              'w-5 h-5 flex-shrink-0',
              shouldSpin && 'animate-spin',
              shouldPulse && 'animate-pulse'
            )}
            style={{ color: config.color }}
            aria-hidden="true"
          />
          <span
            className="text-sm font-medium text-(--app-upload-filename) truncate max-w-37.5"
            title={fileName}
          >
            {fileName}
          </span>
        </div>
        {showCancelButton && (
          <button
            onClick={onCancel}
            className={cn(
              'text-xs text-(--app-upload-cancel) hover:text-(--app-upload-cancel-hover)',
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
              width: `${currentProgress}%`,
              backgroundColor: config.color,
            }}
            role="progressbar"
            aria-label={`Progreso de ${status === 'uploading' ? 'subida' : 'procesamiento'} de ${fileName}`}
            aria-valuenow={currentProgress}
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
            {status === 'processing' && ` ${Math.round(clampedProcessingProgress)}%`}          </>
        )}
      </div>

      {/* Processing Message */}
      {showProcessingMessage && (
        <div className="text-xs mt-2 space-y-1">
          <p className="text-(--colorsNeutralNeutral11)">
            Tiempo estimado restante: {formatTimeLeft(estimatedTimeLeft)}
          </p>
          <p className="text-[12px] text-(--colorsNeutralNeutral11)">
            Extrayendo texto, generando embeddings y analizando estructura...
          </p>
        </div>
      )}
    </div>
  );
}
