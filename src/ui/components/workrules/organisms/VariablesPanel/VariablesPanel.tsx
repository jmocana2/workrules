import { PerfilJson } from '@core/types';
import { cn } from '@lib/utils';
import { Button } from '@ui/components/shadcn/button';
import { ScrollArea } from '@ui/components/shadcn/scroll-area';
import { Separator } from '@ui/components/shadcn/separator';
import { TooltipProvider } from '@ui/components/shadcn/tooltip';
import { ChevronDownIcon, ChevronRightIcon, InfoIcon } from 'lucide-react';
import { VariableCard } from './VariableCard';

export interface VariablesPanelProps {
  perfilJson?: PerfilJson | null;
  onVariableClick: (variable: string, value: string) => void;
  activeVariables?: Record<string, string>;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobile?: boolean;
  inDrawer?: boolean;
  className?: string;
}

export function VariablesPanel({
  perfilJson,
  onVariableClick,
  activeVariables,
  isCollapsed = false,
  onToggleCollapse,
  isMobile = false,
  inDrawer = false,
  className,
}: VariablesPanelProps) {
  const panelShellClass = cn(
    'flex h-full max-h-screen flex-col overflow-auto',
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
            {perfilJson.variables_criticas.map((variable) => (
              <VariableCard
                key={variable}
                variable={variable}
                valores={perfilJson.valores_posibles[variable] || []}
                descripcion={perfilJson.descripciones?.[variable]}
                selectedValue={activeVariables?.[variable]}
                onValueClick={onVariableClick}
              />
            ))}
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
