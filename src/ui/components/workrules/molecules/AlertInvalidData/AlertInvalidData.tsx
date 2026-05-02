import { AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/ui/components/shadcn/alert';
import { Button } from '@/ui/components/shadcn/button';

export interface InvalidDataReason {
  field: string;           // Campo con problema
  value: string | number;  // Valor proporcionado
  limit?: string;          // Límite legal si aplica
  legalReference?: string; // Referencia legal (Art. X ET)
}

export interface AlertInvalidDataProps {
  reason: InvalidDataReason;
  suggestions?: string[];     // Sugerencias de corrección
  onSelectSuggestion?: (suggestion: string) => void;
  onDismiss?: () => void;
  className?: string;
}

export function AlertInvalidData({
  reason,
  suggestions,
  onSelectSuggestion,
  onDismiss,
  className,
}: AlertInvalidDataProps) {
  const { field, value, limit, legalReference } = reason;

  return (
    <Alert
      variant="destructive"
      role="alert"
      aria-live="assertive"
      className={cn('relative', className)}
    >
      {onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="absolute right-2 top-2 h-6 w-6 p-0 hover:bg-destructive/20"
          aria-label="Cerrar alerta"
        >
          <X className="h-4 w-4" />
        </Button>
      )}

      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <div className="flex-1 space-y-2">
          <AlertTitle>Dato fuera de rango</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              Has indicado <strong>{value}</strong> para <strong>{field}</strong>
              {limit && (
                <>
                  , pero {limit}
                </>
              )}
              .
            </p>

            {legalReference && (
              <p className="text-sm italic text-foreground/90">({legalReference})</p>
            )}

            {suggestions && suggestions.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium">Quizás te refieres a:</p>
                {onSelectSuggestion ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    {suggestions.map((suggestion, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => onSelectSuggestion(suggestion)}
                        className="w-full sm:w-auto justify-start border-destructive/30 hover:border-destructive hover:bg-destructive/10 text-foreground"
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <ul className="list-disc space-y-1 pl-5">
                    {suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
