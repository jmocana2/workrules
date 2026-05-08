import { FileText } from 'lucide-react';

interface ConvenioPreviewData {
  nombre: string;
  ambito?: string;
  paginas?: number;
  vigencia?: string;
}

interface ConvenioPreviewProps {
  data: ConvenioPreviewData;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ConvenioPreview({
  data,
  onConfirm,
  onCancel,
  isLoading = false
}: ConvenioPreviewProps) {
  return (
    <div className="p-4 rounded-lg bg-[var(--app-preview-bg)] border border-[var(--app-preview-border)]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-5 h-5 text-[var(--app-preview-header-text)]" />
        <span className="text-sm font-medium text-[var(--app-preview-header-text)]">
          Preview del convenio
        </span>
      </div>

      {/* Datos */}
      <div className="space-y-2 mb-4">
        <div>
          <span className="text-xs text-[var(--app-preview-label-text)]">Nombre:</span>
          <p className="text-sm text-[var(--app-preview-value-text)]">{data.nombre}</p>
        </div>

        {data.ambito && (
          <div>
            <span className="text-xs text-[var(--app-preview-label-text)]">Ambito:</span>
            <p className="text-sm text-[var(--app-preview-value-text)] capitalize">{data.ambito}</p>
          </div>
        )}

        {data.paginas !== undefined && (
          <div>
            <span className="text-xs text-[var(--app-preview-label-text)]">Paginas:</span>
            <p className="text-sm text-[var(--app-preview-value-text)]">{data.paginas}</p>
          </div>
        )}
        {data.vigencia && (
          <div>
            <span className="text-xs text-[var(--app-preview-label-text)]">Vigencia:</span>
            <p className="text-sm text-[var(--app-preview-value-text)]">{data.vigencia}</p>
          </div>
        )}
      </div>

      {/* Botones */}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 px-3 py-2 text-sm rounded-md
            bg-[var(--app-button-outline-bg)]
            border border-[var(--app-button-outline-border)]
            text-[var(--app-button-outline-fg)]
            hover:bg-[var(--app-button-outline-hover)]
            disabled:opacity-50
            transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1 px-3 py-2 text-sm rounded-md
            bg-[var(--app-button-primary-bg)]
            text-[var(--app-button-primary-fg)]
            hover:bg-[var(--app-button-primary-hover)]
            disabled:opacity-50
            transition-colors"
        >
          {isLoading ? 'Procesando...' : 'Confirmar'}
        </button>
      </div>
    </div>
  );
}
