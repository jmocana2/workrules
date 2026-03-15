import { formatRelativeDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button } from '@/ui/components/shadcn/button';
import { ConvenioChip } from '@/ui/components/workrules/atoms';
import { ChevronRight, Info } from 'lucide-react';

export interface ConvenioListItemProps {
  id: string;
  nombre: string;
  ambito: 'estatal' | 'provincial' | 'empresa';
  sector?: string;
  fechaActualizacion?: string;
  isSelected?: boolean;
  onClick?: () => void;
  onInfo?: () => void;
  className?: string;
}

export function ConvenioListItem({
  id,
  nombre,
  ambito,
  sector,
  fechaActualizacion,
  isSelected = false,
  onClick,
  onInfo,
  className,
}: ConvenioListItemProps) {
  return (
    <div
      id={id}
      data-testid={`convenio-${id}`}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
      className={cn(
        'group flex items-center justify-between p-3 rounded-lg border transition-colors',
        onClick && 'cursor-pointer hover:bg-accent/50',
        isSelected && 'bg-primary/5 border-primary/20 ring-1 ring-primary/20',
        !isSelected && 'bg-background hover:border-muted-foreground/20',
        className
      )}
    >
      <div
        className="flex items-center gap-3 min-w-0 flex-1"
      >
        <ConvenioChip
          nombre=""
          ambito={ambito}
          className="shrink-0"
        />

        <div className="min-w-0 flex-1">
          <p className={cn(
            'font-medium truncate',
            isSelected && 'text-foreground'
          )}>
            {nombre}
          </p>
          <div className="flex items-center gap-2 text-xs text-foreground/70">
            {sector && <span>{sector}</span>}
            {sector && fechaActualizacion && <span>•</span>}
            {fechaActualizacion && (
              <span>Actualizado {formatRelativeDate(fechaActualizacion)}</span>
            )}
          </div>
        </div>

        {onClick && (
          <ChevronRight className={cn(
            'h-4 w-4 text-foreground/70 transition-transform',
            'group-hover:translate-x-0.5'
          )} />
        )}
      </div>

      {onInfo && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 focus-visible:opacity-100 transition-opacity shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onInfo();
          }}
          aria-label={`Información sobre ${nombre}`}
        >
          <Info className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
