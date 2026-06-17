import { cn } from '@lib/utils';
import { Badge } from '@ui/components/shadcn/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ui/components/shadcn/tooltip';
import { InfoIcon } from 'lucide-react';

function formatValor(valor: string): string {
  return valor
    .replace(/\banos\b/gi, (m) => (m[0] === 'A' ? 'Años' : 'años'))
    .replace(/\bmas de\b/gi, (m) => (m[0] === 'M' ? 'Más de' : 'más de'));
}

export interface VariableCardProps {
  variable: string;
  valores: string[];
  descripcion?: string;
  selectedValue?: string;
  onValueClick: (variable: string, value: string) => void;
}

export function VariableCard({
  variable,
  valores,
  descripcion,
  selectedValue,
  onValueClick,
}: VariableCardProps) {
  return (
    <div className="rounded-md border border-border/80 bg-background/60">
      <div className="flex items-center gap-2 p-3 pb-2">
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
            <TooltipContent side="left" className="max-w-xs" sideOffset={8}>
              <p className="text-xs">{descripcion}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="max-h-40 overflow-y-auto px-3 pb-3">
        {valores.length === 0 ? (
          <p className="text-xs italic text-muted-foreground">Sin valores definidos</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {valores.map((valor, index) => {
              const isSelected = selectedValue === valor;
              return (
                <Badge
                  key={`${variable}-${valor}-${index}`}
                  variant="secondary"
                  className={cn(
                    'h-auto max-w-full cursor-pointer rounded-[4px] border border-border/70 px-2 py-[5px] text-left text-xs leading-[1.25]',
                    'transition-colors duration-150',
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
                      : 'bg-muted/70 text-foreground hover:bg-[var(--colorsAccentAccent4)] hover:text-[var(--colorsAccentAccent12)]'
                  )}
                  onClick={() => onValueClick(variable, valor)}
                >
                  <span className="block truncate">{formatValor(valor)}</span>
                </Badge>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
