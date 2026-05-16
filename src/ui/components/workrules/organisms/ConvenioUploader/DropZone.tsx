import { cn } from '@/lib/utils';
import { useCallback, useId, useState } from 'react';
import { validatePdfFileAsync } from './utils/fileSelection';

interface DropZoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  maxSizeMB?: number;
}

export function DropZone({
  onFileSelect,
  disabled = false,
  maxSizeMB = 25
}: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  const handleFile = useCallback(async (file: File) => {
    const validationError = await validatePdfFileAsync(file, maxSizeMB);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    onFileSelect(file);
  }, [maxSizeMB, onFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (disabled) return;

    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [disabled, handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  }, [disabled]);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleClick = useCallback(() => {
    if (disabled) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFile(file);
    };
    input.click();
  }, [disabled, handleFile]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label="Subir archivo PDF"
      aria-describedby={error ? errorId : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={cn(
        'relative flex flex-col items-center justify-center',
        'p-6 border-2 border-dashed rounded-lg cursor-pointer',
        'transition-colors duration-200',
        disabled && 'opacity-90 cursor-not-allowed',
        isDragOver
          ? 'border-[var(--colorsAccentAccent9)] bg-[var(--tokensColorsAccentSurface)]'
          : 'border-[var(--colorsNeutralNeutral6)] hover:border-[var(--colorsNeutralNeutral8)]'
      )}
    >      {/* Icono */}
      <svg
        className="w-12 h-12 mb-3 text-[var(--app-dropzone-icon)]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
        />
      </svg>

      {/* Texto */}
      <p className="text-sm font-medium text-[var(--app-dropzone-text-primary)]">
        Arrastra PDF aqui
      </p>
      <p className="text-xs text-[var(--app-dropzone-text-secondary)] mt-1">
        o haz click para seleccionar
      </p>
      <p className="text-xs text-[var(--app-dropzone-text-muted)] mt-2">
        Máximo {maxSizeMB}MB
      </p>

      {/* Error */}
      {error && (
        <div
          id={errorId}
          className="mt-4 px-3 py-2 rounded-md bg-[var(--colorsSemanticErrorAlpha3)] border border-[var(--colorsSemanticError9)]"
        >
          <p className="text-xs text-[var(--colorsSemanticError11)]">
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
