// supabase/functions/_shared/domain/labor-law/smi.ts
//
// Salario Mínimo Interprofesional y validación asociada.

/**
 * Salario Minimo Interprofesional 2026
 * RD febrero 2026 - Subida del 3.1%
 */
export const SMI_2026 = {
  /** SMI mensual en 14 pagas */
  mensual14Pagas: 1221,
  /** SMI mensual en 12 pagas (prorrateado) */
  mensual12Pagas: 1424.5, // 1221 * 14 / 12
  /** SMI anual bruto */
  anual: 17094, // 1221 * 14
};

/**
 * Contexto necesario para comparar correctamente el salario con el SMI.
 *
 * El SMI publicado (1221 €/mes en 14 pagas) asume jornada completa. Para
 * contratos a tiempo parcial se prorratea según la ratio de horas efectivas
 * (Art. 12 ET + RD SMI). Sin este contexto, un salario legalmente correcto
 * a tiempo parcial se marcaría como infracción.
 */
export interface SMIContext {
  /** Horas semanales pactadas en el contrato. */
  horasSemanalesContrato: number;
  /**
   * Horas semanales de la jornada completa de referencia (habitualmente 40
   * según convenio/sector). Se usa para calcular la ratio de tiempo parcial.
   */
  jornadaCompletaHoras: number;
}

/**
 * Resultado de la validacion contra SMI
 */
export interface SMIValidationResult {
  /** Si la remuneración anual es inferior al SMI anual prorrateado por jornada */
  belowSMI: boolean;
  /** Salario bruto anual calculado (mensual × pagas) */
  calculatedAnnualSalary: number;
  /** SMI anual aplicable tras prorratear por ratio de jornada */
  smiAnnualApplicable: number;
  /** Ratio jornada aplicada (1 = completa, 0.5 = mitad de jornada, etc.) */
  jornadaRatio: number;
  /** Diferencia anual (negativa si esta por debajo) */
  difference: number;
  /** Mensaje para mostrar al usuario si aplica */
  message?: string;
}

/**
 * Valida si la remuneración anual de un contrato es inferior al SMI aplicable.
 *
 * La comparación se hace en términos ANUALES BRUTOS (Art. 27 ET + RD SMI),
 * prorrateando el SMI por la ratio de jornada cuando el contrato es a tiempo
 * parcial. Sin `context` se asume jornada completa (ratio 1).
 *
 * IMPORTANTE: esta validación no incorpora complementos salariales, en especie
 * ni reglas de compensación específicas del RD; sirve como aviso preventivo,
 * no como dictamen legal.
 *
 * @param salarioMensual - Salario bruto mensual calculado.
 * @param pagas - Número de pagas (12 o 14). Por defecto 14.
 * @param context - Contexto de jornada; omitir si es jornada completa.
 */
export function validateAgainstSMI(
  salarioMensual: number,
  pagas: 12 | 14 = 14,
  context?: SMIContext,
): SMIValidationResult {
  const rawRatio = context
    ? context.horasSemanalesContrato / context.jornadaCompletaHoras
    : 1;
  // Los contratos a tiempo completo con horas puntualmente superiores no
  // aumentan el SMI aplicable — el prorrateo solo baja, nunca sube.
  const jornadaRatio = Math.min(1, Math.max(0, rawRatio));

  const smiAnnualFullTime = SMI_2026.anual;
  const smiAnnualApplicable = smiAnnualFullTime * jornadaRatio;
  const calculatedAnnualSalary = salarioMensual * pagas;
  const difference = calculatedAnnualSalary - smiAnnualApplicable;
  const belowSMI = calculatedAnnualSalary < smiAnnualApplicable;

  const result: SMIValidationResult = {
    belowSMI,
    calculatedAnnualSalary,
    smiAnnualApplicable,
    jornadaRatio,
    difference,
  };

  if (belowSMI) {
    const formatEuro = (n: number) =>
      n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const jornadaNota = jornadaRatio < 1
      ? ` (prorrateado al ${(jornadaRatio * 100).toFixed(0)}% de jornada)`
      : "";

    result.message =
      `**Alerta SMI:** La remuneración anual calculada ` +
      `(${formatEuro(calculatedAnnualSalary)}€ = ${formatEuro(salarioMensual)}€ × ${pagas} pagas) ` +
      `es inferior al Salario Mínimo Interprofesional anual aplicable ` +
      `(${formatEuro(smiAnnualApplicable)}€${jornadaNota}).\n\n` +
      `Verifique complementos, en especie y reglas de compensación del RD antes ` +
      `de concluir infracción. *Referencia: Art. 27 del Estatuto de los ` +
      `Trabajadores y RD SMI vigente.*`;
  }

  return result;
}
