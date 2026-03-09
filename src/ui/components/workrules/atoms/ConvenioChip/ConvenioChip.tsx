/**
 * ConvenioChip - Componente chip para mostrar convenios con indicadores de ámbito
 *
 * Muestra el nombre de un convenio colectivo con un indicador visual de su ámbito:
 * - [E] para estatal - usa colores accent/teal
 * - [P] para provincial - usa colores success/green
 * - [Emp] para empresa - usa colores info/cyan
 *
 * Soporta modo removible con icono X y estado seleccionado con resaltado de anillo
 */

import { cn } from '@/lib/utils';
import { Badge } from '@/ui/components/shadcn/badge';
import { X } from 'lucide-react';

export interface ConvenioChipProps {
  /** Nombre del convenio colectivo */
  nombre: string;
  /** Ámbito del convenio colectivo */
  ambito?: 'estatal' | 'provincial' | 'empresa';
  /** Si es true, muestra un botón de eliminar con icono X */
  removable?: boolean;
  /** Callback cuando se hace clic en el botón de eliminar */
  onRemove?: () => void;
  /** Si es true, muestra resaltado con ring-2 de color accent */
  selected?: boolean;
  /** Callback cuando se hace clic en el chip */
  onClick?: () => void;
  /** Clases CSS adicionales */
  className?: string;
}

/**
 * Obtiene el texto indicador del ámbito basado en el valor de ambito
 */
const getAmbitoIndicator = (ambito?: ConvenioChipProps['ambito']): string => {
  switch (ambito) {
    case 'estatal':
      return '[E]';
    case 'provincial':
      return '[P]';
    case 'empresa':
      return '[Emp]';
    default:
      return '';
  }
};

/**
 * Obtiene las clases CSS para estilos basados en el valor de ambito
 * Usa tokens del sistema de diseño para consistencia temática
 */
const getAmbitoClasses = (ambito?: ConvenioChipProps['ambito']): string => {
  switch (ambito) {
    case 'estatal':
      return 'border-[var(--colorsAccentAccent9)] text-[var(--colorsAccentAccent11)] bg-[var(--colorsAccentAccent2)] hover:bg-[var(--colorsAccentAccent3)]';
    case 'provincial':
      return 'border-[var(--colorsSemanticSuccess9)] text-[var(--colorsSemanticSuccess11)] bg-[var(--colorsSemanticSuccess1)] hover:bg-[var(--colorsSemanticSuccess2)]';
    case 'empresa':
      return 'border-[var(--colorsSemanticInfo9)] text-[var(--colorsSemanticInfo11)] bg-[var(--colorsSemanticInfo1)] hover:bg-[var(--colorsSemanticInfo2)]';
    default:
      return '';
  }
};

export const ConvenioChip = ({
  nombre,
  ambito,
  removable = false,
  onRemove,
  selected = false,
  onClick,
  className,
}: ConvenioChipProps) => {
  const ambitoIndicator = getAmbitoIndicator(ambito);
  const ambitoClasses = getAmbitoClasses(ambito);

  const handleRemoveClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onRemove?.();
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1.5 h-auto py-1 px-2.5 transition-all',
        ambitoClasses,
        onClick && 'cursor-pointer',
        selected && 'ring-2 ring-[var(--colorsAccentAccent9)] ring-offset-2 ring-offset-background',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >      {ambitoIndicator && (
        <span className="font-semibold text-[0.625rem] leading-none opacity-90">
          {ambitoIndicator}
        </span>
      )}
      <span className="max-w-[200px] truncate text-xs leading-none">
        {nombre}
      </span>
      {removable && (
        <button
          type="button"
          onClick={handleRemoveClick}
          aria-label={`Eliminar ${nombre}`}
          className="ml-0.5 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-[var(--colorsAccentAccent9)] focus:ring-offset-1"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </Badge>
  );
};
