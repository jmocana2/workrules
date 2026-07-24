// supabase/functions/_shared/domain/labor-law/legal-limits.ts
//
// Derecho positivo español aplicable a los cálculos del dominio.
// Estas constantes son POLÍTICA LEGAL, no reglas del use case: viven aquí
// para ser reutilizables desde cualquier VO o comando sin depender de
// `core/chat/`.

export const LEGAL_LIMITS = {
  /**
   * Máximo anual de horas extras — 80h según Art. 35.2 ET.
   *
   * NOTA: El límite legal aplica sobre horas **computables**; excluye las
   * compensadas con descanso equivalente en 4 meses (Art. 35.1 ET) y las de
   * fuerza mayor / prevención / reparación de siniestros (Art. 35.3 ET).
   * Sobre input bruto del usuario esta constante actúa como restricción de
   * producto para acotar valores atípicos, no como validación legal.
   */
  horasExtraAnuales: 80,
  /**
   * Máximo semanal "regular" que aceptamos como input de perfil.
   *
   * NOTA: NO es un límite legal duro. El Art. 34.1 ET fija 40h como
   * **promedio en cómputo anual**; una distribución irregular lícita puede
   * situar semanas concretas por encima de 40h. Este cap es una restricción
   * de producto: los perfiles esperan la jornada regular pactada, no el
   * horario efectivo de una semana atípica.
   */
  jornadaSemanalMaxima: 40,
  /** Minimo razonable */
  jornadaSemanalMinima: 1,
  /** Maximo razonable de antiguedad */
  antiguedadMaxima: 50,
};
