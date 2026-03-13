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
        'border-[var(--colorsSemanticWarning9)] bg-[var(--colorsSemanticWarning1)] text-[var(--colorsNeutralNeutral12)]',
        className
      )}
    >
      <AlertTriangle className="text-[var(--colorsSemanticWarning9)]" />

      {onDismiss && (
        <AlertAction>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onDismiss}
            aria-label="Cerrar alerta"
            className="text-[var(--colorsNeutralNeutral11)] hover:text-[var(--colorsNeutralNeutral12)]"
          >
            <X className="size-3.5" />
          </Button>
        </AlertAction>
      )}

      <AlertTitle className="text-[var(--colorsSemanticWarning11)] font-[var(--typographyFontWeightMedium)]">
        Alerta de Salario Mínimo
      </AlertTitle>

      <AlertDescription className="space-y-4">
        <p className="text-[var(--colorsNeutralNeutral11)] text-[var(--typographyFontSize2)] leading-[var(--typographyLineHeight2)]">
          El cálculo según convenio resulta en{' '}
          <span className="font-[var(--typographyFontWeightMedium)] text-[var(--colorsNeutralNeutral12)]">
            {formatCurrency(calculatedAmount)}
          </span>
          /mes, pero el SMI vigente para {smiYear} es de{' '}
          <span className="font-[var(--typographyFontWeightMedium)] text-[var(--colorsNeutralNeutral12)]">
            {formatCurrency(smiAmount)}
          </span>{' '}
          ({periodText}).
        </p>

        <div
          className={cn(
            'rounded-[var(--radius3)] border border-[var(--colorsSemanticWarning7)]',
            'bg-[var(--colorsSemanticWarning2)] p-[var(--spacing4)]',
            'space-y-[var(--spacing2)]'
          )}
        >
          <p className="text-[var(--colorsNeutralNeutral12)] text-[var(--typographyFontSize2)] font-[var(--typographyFontWeightMedium)]">
            Por ley, se aplica el salario mayor. El salario mínimo para este trabajador sería:
          </p>

          <div className="flex flex-col gap-[var(--spacing1)] text-[var(--typographyFontSize2)]">
            <div className="flex justify-between items-baseline">
              <span className="text-[var(--colorsNeutralNeutral11)]">Bruto mensual:</span>
              <span className="font-[var(--typographyFontWeightMedium)] text-[var(--colorsNeutralNeutral12)] text-[var(--typographyFontSize3)]">
                {formatCurrency(adjustedAmount)}
              </span>
            </div>

            <div className="flex justify-between items-baseline">
              <span className="text-[var(--colorsNeutralNeutral11)]">Bruto anual:</span>
              <span className="font-[var(--typographyFontWeightMedium)] text-[var(--colorsNeutralNeutral12)] text-[var(--typographyFontSize3)]">
                {formatCurrency(annualAmount)}
              </span>
            </div>
          </div>
        </div>

        <p className="text-[var(--colorsNeutralNeutral10)] text-[var(--typographyFontSize1)] leading-[var(--typographyLineHeight1)]">
          Referencia: Art. 27 del Estatuto de los Trabajadores.
        </p>

        {onViewDetails && (
          <div className="pt-[var(--spacing2)]">
            <Button
              variant="outline"
              size="sm"
              onClick={onViewDetails}
              className="border-[var(--colorsSemanticWarning7)] text-[var(--colorsSemanticWarning11)] hover:bg-[var(--colorsSemanticWarning2)]"
            >
              Ver desglose completo
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
