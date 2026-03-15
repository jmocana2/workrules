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
  className?: string;
}

export function VariablesPanel({
  perfilJson,
  onVariableClick,
  isCollapsed = false,
  onToggleCollapse,
  className,
}: VariablesPanelProps) {
  // Estado colapsado - solo botón de expandir
  if (isCollapsed) {
    return (
      <div
        className={cn(
          'flex h-full w-10 flex-col items-center border-l border-[var(--colorsNeutralNeutral6)] bg-[var(--colorsNeutralNeutral2)]',
          className
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="mt-4 h-8 w-8 text-[var(--colorsNeutralNeutral11)] hover:bg-[var(--colorsNeutralNeutral4)] hover:text-[var(--colorsNeutralNeutral12)]"
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
          'flex h-full w-64 flex-col border-l border-[var(--colorsNeutralNeutral6)] bg-[var(--colorsNeutralNeutral2)]',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--colorsNeutralNeutral6)] p-4">
          <h2 className="text-sm font-medium text-[var(--colorsNeutralNeutral12)]">
            Variables del convenio
          </h2>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="h-6 w-6 text-[var(--colorsNeutralNeutral11)] hover:bg-[var(--colorsNeutralNeutral4)] hover:text-[var(--colorsNeutralNeutral12)]"
              aria-label="Colapsar panel"
            >
              <ChevronDownIcon className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Empty state */}
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--colorsNeutralNeutral3)]">
            <InfoIcon className="h-6 w-6 text-[var(--colorsNeutralNeutral11)]" />
          </div>
          <p className="text-center text-sm text-[var(--colorsNeutralNeutral11)]">
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
          'flex h-full w-64 flex-col border-l border-[var(--colorsNeutralNeutral6)] bg-[var(--colorsNeutralNeutral2)]',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--colorsNeutralNeutral6)] p-4">
          <h2 className="text-sm font-medium text-[var(--colorsNeutralNeutral12)]">
            Variables del convenio
          </h2>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="h-6 w-6 text-[var(--colorsNeutralNeutral11)] hover:bg-[var(--colorsNeutralNeutral4)] hover:text-[var(--colorsNeutralNeutral12)]"
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
                <div key={variable} className="space-y-2">
                  {/* Variable name */}
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--colorsNeutralNeutral11)]">
                      {variable}
                    </h3>
                    {descripcion && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className="flex items-center justify-center text-[var(--colorsNeutralNeutral10)] hover:text-[var(--colorsNeutralNeutral12)]"
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
                    <p className="text-xs italic text-[var(--colorsNeutralNeutral10)]">
                      Sin valores definidos
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {valores.map((valor, index) => (
                        <Badge
                          key={`${variable}-${valor}-${index}`}
                          variant="secondary"
                          className={cn(
                            'cursor-pointer text-xs',
                            'hover:bg-[var(--colorsAccentAccent4)] hover:text-[var(--colorsAccentAccent11)]',
                            'transition-colors duration-150'
                          )}
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
        <div className="border-t border-[var(--colorsNeutralNeutral6)]">
          <Separator className="bg-[var(--colorsNeutralNeutral6)]" />
          <div className="p-4">
            <p className="text-xs text-[var(--colorsNeutralNeutral11)]">
              {perfilJson.convenio}
            </p>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
