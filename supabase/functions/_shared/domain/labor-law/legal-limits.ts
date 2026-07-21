// supabase/functions/_shared/domain/labor-law/legal-limits.ts
//
// Derecho positivo español aplicable a los cálculos del dominio.
// Estas constantes son POLÍTICA LEGAL, no reglas del use case: viven aquí
// para ser reutilizables desde cualquier VO o comando sin depender de
// `core/chat/`.

export const LEGAL_LIMITS = {
  /** Art. 35.2 ET - Maximo horas extra anuales */
  horasExtraAnuales: 80,
  /** Art. 34.1 ET - Jornada maxima semanal */
  jornadaSemanalMaxima: 40,
  /** Minimo razonable */
  jornadaSemanalMinima: 1,
  /** Maximo razonable de antiguedad */
  antiguedadMaxima: 50,
};
