import { PerfilJson } from '@core/types';
import { cn } from '@lib/utils';
import { Badge } from '@ui/components/shadcn/badge';
import { Button } from '@ui/components/shadcn/button';
import { ScrollArea } from '@ui/components/shadcn/scroll-area';
import { Separator } from '@ui/components/shadcn/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@ui/components/shadcn/tooltip';
import { ChevronDownIcon, ChevronRightIcon, InfoIcon } from 'lucide-react';

export interface VariablesPanelProps {
  perfilJson?: PerfilJson | null;
  onVariableClick: (variable: string, value: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobile?: boolean;
  inDrawer?: boolean;
  className?: string;
}

export function VariablesPanel({
  perfilJson,
  onVariableClick,
  isCollapsed = false,
  onToggleCollapse,
  isMobile = false,
  inDrawer = false,
  className,
}: VariablesPanelProps) {
  const panelShellClass = cn(
    'flex h-full flex-col',
    inDrawer ? 'bg-card' : 'bg-muted/50'
  );
  const headerClass = 'flex items-center justify-between px-4 py-3';
  const toggleButtonClass = 'h-7 w-7 text-muted-foreground hover:bg-muted hover:text-foreground';

  // Estado colapsado - solo botón de expandir
  if (isCollapsed) {
    return (
      <div
        className={cn(
          panelShellClass,
          'w-11 items-center',
          className
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className={cn('mt-3', toggleButtonClass)}
          aria-label="Expandir panel de variables"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Estado sin perfil
  if (!perfilJson) {
    return (
      <div
        className={cn(
          panelShellClass,
          isMobile ? 'w-full' : 'w-64',
          className
        )}
      >
        {/* Header */}
        <div className={headerClass}>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-foreground">Variables del convenio</h2>
          </div>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className={toggleButtonClass}
              aria-label="Colapsar panel"
            >
              <ChevronDownIcon className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Empty state */}
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted">
            <InfoIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-center text-sm text-foreground">
            Selecciona un convenio para ver sus variables
          </p>
        </div>
      </div>
    );
  }

  // Estado expandido con datos
  return (
    <TooltipProvider>
      <div
        className={cn(
          panelShellClass,
          isMobile ? 'w-full' : 'w-64',
          className
        )}
      >
        {/* Header */}
        <div className={headerClass}>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-foreground">Variables del convenio</h2>
          </div>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className={toggleButtonClass}
              aria-label="Colapsar panel"
            >
              <ChevronDownIcon className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Variables list */}
        <ScrollArea className="flex-1">
          <div className="space-y-6 p-4">
            {perfilJson.variables_criticas.map((variable) => {
              const valores = perfilJson.valores_posibles[variable] || [];
              const descripcion = perfilJson.descripciones?.[variable];

              return (
                <div key={variable} className="space-y-2 rounded-md border border-border/80 bg-background/60 p-3">
                  {/* Variable name */}
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                      {variable}
                    </h3>
                    {descripcion && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className="flex items-center justify-center text-muted-foreground hover:text-foreground"
                            aria-label={`Información sobre ${variable}`}
                          >
                            <InfoIcon className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="left"
                          className="max-w-xs"
                          sideOffset={8}
                        >
                          <p className="text-xs">{descripcion}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>

                  {/* Values badges */}
                  {valores.length === 0 ? (
                    <p className="text-xs italic text-muted-foreground">
                      Sin valores definidos
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {valores.map((valor, index) => (
                        <Badge
                          key={`${variable}-${valor}-${index}`}
                          variant="secondary"
                          className={cn(
                            'cursor-pointer border border-border/70 bg-muted/70 text-xs text-foreground',
                            'hover:bg-[var(--colorsAccentAccent4)] hover:text-[var(--colorsAccentAccent12)]',
                            'transition-colors duration-150'                          )}
                          onClick={() => onVariableClick(variable, valor)}
                        >
                          {valor}
                        </Badge>
                      ))}                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-border">
          <Separator className="bg-border" />
          <div className="p-4">
            <p className="truncate text-xs text-muted-foreground" title={perfilJson.convenio}>
              {perfilJson.convenio}
            </p>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
