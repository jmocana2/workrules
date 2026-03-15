import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@/ui/components/shadcn/alert';
import { Button } from '@/ui/components/shadcn/button';
import { AlertTriangle, X } from 'lucide-react';

export interface AlertSMIProps {
  calculatedAmount: number; // Monto calculado según convenio
  smiAmount: number; // SMI vigente
  adjustedAmount: number; // Monto ajustado (mayor de ambos)
  payPeriod?: '14-pagas' | '12-pagas';
  year?: number; // Ano de referencia para el SMI mostrado
  onViewDetails?: () => void; // Ver desglose completo
  onDismiss?: () => void; // Cerrar alerta
  className?: string;
}

export function AlertSMI({
  calculatedAmount,
  smiAmount,
  adjustedAmount,
  payPeriod = '14-pagas',
  year,
  onViewDetails,
  onDismiss,
  className,
}: AlertSMIProps) {
  // Calcular anual según tipo de pago
  const annualAmount =
    payPeriod === '14-pagas' ? adjustedAmount * 14 : adjustedAmount * 12;

  // Formatear texto del periodo
  const periodText = payPeriod === '14-pagas' ? '14 pagas' : '12 pagas prorrateadas';
  const smiYear = year ?? new Date().getFullYear();

  return (
    <Alert
      role="alert"
      aria-live="polite"
      className={cn(
        'border-(--app-alert-warning-border) bg-(--app-alert-warning-bg) text-(--app-alert-warning-fg)',
        className
      )}
    >
      <AlertTriangle className="text-(--app-alert-warning-icon)" />

      {onDismiss && (
        <AlertAction>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onDismiss}
            aria-label="Cerrar alerta"
            className="text-(--app-alert-warning-muted) hover:text-(--app-alert-warning-fg)"
          >
            <X className="size-3.5" />
          </Button>
        </AlertAction>
      )}

      <AlertTitle className="text-(--app-alert-warning-title) font-(--typographyFontWeightMedium)">
        Alerta de Salario Mínimo
      </AlertTitle>

      <AlertDescription className="space-y-4">
        <p className="text-(--app-alert-warning-fg) text-(length:--typographyFontSize2) leading-(--typographyLineHeight2)">
          El cálculo según convenio resulta en{' '}
          <span className="font-(--typographyFontWeightMedium) text-(--app-alert-warning-fg)">
            {formatCurrency(calculatedAmount)}
          </span>
          /mes, pero el SMI vigente para {smiYear} es de{' '}
          <span className="font-(--typographyFontWeightMedium) text-(--app-alert-warning-fg)">
            {formatCurrency(smiAmount)}
          </span>{' '}
          ({periodText}).
        </p>

        <div
          className={cn(
            'rounded-(--radius3) border border-(--app-alert-warning-border)',
            'bg-(--app-alert-warning-surface) p-(--spacing4)',
            'space-y-(--spacing2)'
          )}
        >
          <p className="text-(--app-alert-warning-fg) text-(length:--typographyFontSize2) font-(--typographyFontWeightMedium)">
            Por ley, se aplica el salario mayor. El salario mínimo para este trabajador sería:
          </p>

          <div className="flex flex-col gap-(--spacing1) text-(length:--typographyFontSize2)">
            <div className="flex justify-between items-baseline">
              <span className="text-(--app-alert-warning-fg)">Bruto mensual:</span>
              <span className="font-(--typographyFontWeightMedium) text-(--app-alert-warning-fg) text-(length:--typographyFontSize3)">
                {formatCurrency(adjustedAmount)}
              </span>
            </div>

            <div className="flex justify-between items-baseline">
              <span className="text-(--app-alert-warning-fg)">Bruto anual:</span>
              <span className="font-(--typographyFontWeightMedium) text-(--app-alert-warning-fg) text-(length:--typographyFontSize3)">
                {formatCurrency(annualAmount)}
              </span>
            </div>
          </div>
        </div>

        <p className="text-(--app-alert-warning-muted) text-(length:--typographyFontSize1) leading-(--typographyLineHeight1)">
          Referencia: Art. 27 del Estatuto de los Trabajadores.
        </p>

        {onViewDetails && (
          <div className="pt-(--spacing2)">
            <Button
              variant="outline"
              size="sm"
              onClick={onViewDetails}
              className="border-(--app-alert-warning-border) text-(--app-alert-warning-fg) hover:bg-(--app-alert-warning-hover) hover:text-(--app-alert-warning-fg)"
            >
              Ver desglose completo
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
