import { AlertTriangle, X } from 'lucide-react';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/ui/components/shadcn/alert';
import { Button } from '@/ui/components/shadcn/button';
import { cn } from '@/lib/utils';

export interface ConflictDetail {
  field1: { name: string; value: string };
  field2: { name: string; value: string };
  explanation: string;
}

export interface ConflictOption {
  label: string;
  value: string;
}

export interface AlertConflictProps {
  conflict: ConflictDetail;
  options: ConflictOption[];
  onSelectOption: (option: ConflictOption) => void;
  onDismiss?: () => void;
  className?: string;
}

export function AlertConflict({
  conflict,
  options,
  onSelectOption,
  onDismiss,
  className,
}: AlertConflictProps) {
  return (
    <Alert
      variant="default"
      className={cn(
        // Custom warning/yellow styles
        'border-[var(--colorsSemanticWarning9)]',
        'bg-[var(--colorsSemanticWarning1)]',
        'text-[var(--colorsSemanticWarning11)]',
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <AlertTriangle className="text-[var(--colorsSemanticWarning9)]" />

      {onDismiss && (
        <AlertAction>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onDismiss}
            aria-label="Cerrar alerta"
            className="hover:bg-[var(--colorsSemanticWarning3)]"
          >
            <X />
          </Button>
        </AlertAction>
      )}

      <AlertTitle className="text-[var(--colorsSemanticWarning11)]">
        Conflicto detectado
      </AlertTitle>

      <AlertDescription className="text-[var(--colorsSemanticWarning11)]">
        <div className="space-y-3">
          {/* Conflict fields */}
          <div className="grid gap-2">
            <div className="flex items-baseline gap-2">
              <span className="font-medium text-sm">{conflict.field1.name}:</span>
              <code className="text-xs bg-[var(--colorsSemanticWarning3)] px-2 py-0.5 rounded border border-[var(--colorsSemanticWarning7)]">
                {conflict.field1.value}
              </code>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-medium text-sm">{conflict.field2.name}:</span>
              <code className="text-xs bg-[var(--colorsSemanticWarning3)] px-2 py-0.5 rounded border border-[var(--colorsSemanticWarning7)]">
                {conflict.field2.value}
              </code>
            </div>
          </div>

          {/* Explanation */}
          <p className="text-sm">{conflict.explanation}</p>

          {/* Options buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            {options.map((option) => (
              <Button
                key={option.value}
                variant="outline"
                size="sm"
                onClick={() => onSelectOption(option)}
                className={cn(
                  'border-[var(--colorsSemanticWarning9)]',
                  'text-foreground',
                  'hover:bg-[var(--colorsSemanticWarning3)]',
                  'hover:text-foreground',
                  'focus-visible:ring-[var(--colorsSemanticWarning9)]'
                )}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
