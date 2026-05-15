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
      return 'border-[var(--colorsAccentAccent9)] text-[var(--colorsAccentAccent12)] bg-[var(--colorsAccentAccent2)] hover:bg-[var(--colorsAccentAccent3)]';
    case 'provincial':
      return 'border-[var(--colorsSemanticSuccess9)] text-[var(--colorsSemanticSuccess12)] bg-[var(--colorsSemanticSuccess1)] hover:bg-[var(--colorsSemanticSuccess2)]';
    case 'empresa':
      return 'border-[var(--colorsSemanticInfo9)] text-[var(--colorsSemanticInfo12)] bg-[var(--colorsSemanticInfo1)] hover:bg-[var(--colorsSemanticInfo2)]';
    default:
      return 'border-[var(--colorsNeutralNeutral9)] text-[var(--colorsNeutralNeutral12)] bg-[var(--colorsNeutralNeutral2)] hover:bg-[var(--colorsNeutralNeutral3)]';
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
  const usesBadgeButtonBehavior = !!onClick && !removable;
  const showsInnerSelectButton = !!onClick && removable;

  const handleRemoveClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onRemove?.();
  };

  const handleBadgeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  const content = (
    <>
      {ambitoIndicator && (
        <span className="font-semibold text-[0.625rem] leading-none">
          {ambitoIndicator}
        </span>
      )}
      <span className="max-w-50 truncate text-xs leading-none" title={nombre}>
        {nombre}
      </span>
    </>
  );

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1.5 h-auto py-1 px-2.5 transition-all',
        ambitoClasses,
        usesBadgeButtonBehavior && 'cursor-pointer',
        selected && 'ring-2 ring-(--colorsAccentAccent9) ring-offset-2 ring-offset-background',
        className
      )}
      onClick={usesBadgeButtonBehavior ? onClick : undefined}
      role={usesBadgeButtonBehavior ? 'button' : undefined}
      tabIndex={usesBadgeButtonBehavior ? 0 : undefined}
      onKeyDown={usesBadgeButtonBehavior ? handleBadgeKeyDown : undefined}
    >
      {showsInnerSelectButton ? (
        <button
          type="button"
          onClick={onClick}
          className="inline-flex min-w-0 items-center gap-1.5 rounded-sm text-left transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-(--colorsAccentAccent9) focus:ring-offset-1"
          aria-label={`Seleccionar ${nombre}`}
        >
          {content}
        </button>
      ) : (
        content
      )}
      {removable && (
        <button
          type="button"
          onClick={handleRemoveClick}
          aria-label={`Eliminar ${nombre}`}
          className="ml-0.5 rounded-sm transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-(--colorsAccentAccent9) focus:ring-offset-1"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </Badge>
  );
};
