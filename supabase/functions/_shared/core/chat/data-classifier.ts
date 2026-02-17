/**
 * Clasificador de estado de datos para calculos salariales
 *
 * Verifica que los datos del usuario sean validos, completos y coherentes
 * antes de realizar un calculo salarial.
 *
 * @module data-classifier
 */

import type { PerfilContexto } from "./prompts.ts";
import type {
  DataClassificationResult,
  DataState,
  ExtractedVariables,
} from "./types.ts";

// ============================================
// LIMITES LEGALES
// ============================================

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

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

/**
 * Clasifica el estado de los datos para un calculo salarial
 *
 * @param variables - Variables extraidas del mensaje
 * @param perfil - Perfil del convenio
 * @returns Resultado de clasificacion
 *
 * @example
 * const result = classifyDataState(
 *   { categoria: "Camarero", horasExtra: 100 },
 *   perfil
 * );
 * // result.state === "invalid" (horasExtra > 80)
 */
export function classifyDataState(
  variables: ExtractedVariables,
  perfil: PerfilContexto | null,
): DataClassificationResult {
  const result: DataClassificationResult = {
    state: "complete",
    extractedVariables: variables,
    missingVariables: [],
    invalidVariables: [],
    conflictingVariables: [],
    suggestions: {},
  };

  // 1. Verificar variables invalidas
  checkInvalidVariables(variables, result);

  // 2. Verificar conflictos
  checkConflicts(variables, result);

  // 3. Verificar variables faltantes
  if (perfil) {
    checkMissingVariables(variables, perfil, result);
  }

  // 4. Determinar estado final
  result.state = determineState(result);

  return result;
}

// ============================================
// VERIFICACIONES
// ============================================

/**
 * Verifica variables con valores fuera de limites legales
 */
function checkInvalidVariables(
  variables: ExtractedVariables,
  result: DataClassificationResult,
): void {
  // Horas extra > 80 anuales
  if (
    variables.horasExtra !== undefined &&
    variables.horasExtra > LEGAL_LIMITS.horasExtraAnuales
  ) {
    result.invalidVariables.push({
      name: "horasExtra",
      reason:
        `El maximo legal de horas extra es ${LEGAL_LIMITS.horasExtraAnuales}/ano (Art. 35.2 ET)`,
      value: variables.horasExtra,
    });
  }

  // Jornada > 40h semanales
  if (
    variables.horasSemanales !== undefined &&
    variables.horasSemanales > LEGAL_LIMITS.jornadaSemanalMaxima
  ) {
    result.invalidVariables.push({
      name: "horasSemanales",
      reason:
        `La jornada maxima legal es ${LEGAL_LIMITS.jornadaSemanalMaxima}h semanales (Art. 34.1 ET)`,
      value: variables.horasSemanales,
    });
  }

  // Horas semanales < 1
  if (
    variables.horasSemanales !== undefined &&
    variables.horasSemanales < LEGAL_LIMITS.jornadaSemanalMinima
  ) {
    result.invalidVariables.push({
      name: "horasSemanales",
      reason: "La jornada debe ser de al menos 1 hora semanal",
      value: variables.horasSemanales,
    });
  }

  // Antiguedad > 50 anos
  if (
    variables.antiguedadAnos !== undefined &&
    variables.antiguedadAnos > LEGAL_LIMITS.antiguedadMaxima
  ) {
    result.invalidVariables.push({
      name: "antiguedadAnos",
      reason:
        `La antiguedad indicada (${variables.antiguedadAnos} anos) parece incorrecta`,
      value: variables.antiguedadAnos,
    });
  }

  // Antiguedad negativa
  if (
    variables.antiguedadAnos !== undefined &&
    variables.antiguedadAnos < 0
  ) {
    result.invalidVariables.push({
      name: "antiguedadAnos",
      reason: "La antiguedad no puede ser negativa",
      value: variables.antiguedadAnos,
    });
  }

  // Horas nocturnas negativas
  if (
    variables.horasNocturnas !== undefined &&
    variables.horasNocturnas < 0
  ) {
    result.invalidVariables.push({
      name: "horasNocturnas",
      reason: "Las horas nocturnas no pueden ser negativas",
      value: variables.horasNocturnas,
    });
  }

  // Horas extra negativas
  if (
    variables.horasExtra !== undefined &&
    variables.horasExtra < 0
  ) {
    result.invalidVariables.push({
      name: "horasExtra",
      reason: "Las horas extra no pueden ser negativas",
      value: variables.horasExtra,
    });
  }
}

/**
 * Verifica conflictos entre variables
 */
function checkConflicts(
  variables: ExtractedVariables,
  result: DataClassificationResult,
): void {
  // Conflicto: jornada completa pero menos de 35h
  if (
    variables.jornada === "completa" &&
    variables.horasSemanales !== undefined &&
    variables.horasSemanales < 35
  ) {
    result.conflictingVariables.push({
      variables: ["jornada", "horasSemanales"],
      reason:
        `Indicas jornada completa pero ${variables.horasSemanales}h semanales. ` +
        "La jornada completa es tipicamente 40h. ¿Es jornada parcial?",
    });
  }

  // Conflicto: jornada parcial pero 40h
  if (
    variables.jornada === "parcial" &&
    variables.horasSemanales !== undefined &&
    variables.horasSemanales >= 40
  ) {
    result.conflictingVariables.push({
      variables: ["jornada", "horasSemanales"],
      reason:
        `Indicas jornada parcial pero ${variables.horasSemanales}h semanales. ` +
        "Esto corresponde a jornada completa.",
    });
  }
}

/**
 * Verifica variables faltantes segun el perfil del convenio
 */
function checkMissingVariables(
  variables: ExtractedVariables,
  perfil: PerfilContexto,
  result: DataClassificationResult,
): void {
  const variablesCriticas = perfil.variables_criticas || [];

  // Mappeo de nombres de variables criticas a propiedades de ExtractedVariables
  const mapping: Record<string, keyof ExtractedVariables> = {
    categoria: "categoria",
    "categoria profesional": "categoria",
    categoría: "categoria",
    "categoría profesional": "categoria",
    jornada: "jornada",
    "tipo de jornada": "jornada",
    "nivel de establecimiento": "nivelEstablecimiento",
    "nivel establecimiento": "nivelEstablecimiento",
    "tipo de establecimiento": "nivelEstablecimiento",
    antiguedad: "antiguedadAnos",
    antigüedad: "antiguedadAnos",
  };

  for (const varCritica of variablesCriticas) {
    const varLower = varCritica.toLowerCase();
    const propName = mapping[varLower];

    if (propName && variables[propName] === undefined) {
      result.missingVariables.push(varCritica);

      // Anadir sugerencias si disponibles
      if (varLower.includes("categoria") && perfil.categorias_profesionales) {
        result.suggestions[varCritica] = perfil.categorias_profesionales.map(
          (c) => c.nombre,
        );
      }
    }
  }
}

/**
 * Determina el estado final basado en las verificaciones
 */
function determineState(result: DataClassificationResult): DataState {
  if (result.invalidVariables.length > 0) {
    return "invalid";
  }
  if (result.conflictingVariables.length > 0) {
    return "conflicting";
  }
  if (result.missingVariables.length > 0) {
    return "incomplete";
  }
  return "complete";
}

// ============================================
// GENERADORES DE MENSAJES
// ============================================

/**
 * Genera mensaje amigable para estado incompleto
 *
 * @param result - Resultado de clasificacion
 * @param convenioName - Nombre del convenio
 * @returns Mensaje para mostrar al usuario
 */
export function buildIncompleteMessage(
  result: DataClassificationResult,
  convenioName: string,
): string {
  const missing = result.missingVariables[0]; // Solo preguntar por uno a la vez
  const opciones = result.suggestions[missing];

  let message =
    `Para calcular el salario segun el Convenio de ${convenioName}, ` +
    `necesito saber tu **${missing}**`;

  if (opciones && opciones.length > 0) {
    message += ":\n\n";
    message += opciones.map((o) => `- **${o}**`).join("\n");
    message +=
      "\n\nSi no conoces este dato, puedo mostrarte un rango de valores.";
  } else {
    message += ".";
  }

  return message;
}

/**
 * Genera mensaje amigable para estado invalido
 *
 * @param result - Resultado de clasificacion
 * @returns Mensaje para mostrar al usuario
 */
export function buildInvalidMessage(
  result: DataClassificationResult,
): string {
  const invalid = result.invalidVariables[0];
  if (!invalid) {
    return "Error: No se encontraron datos invalidos.";
  }

  return (
    `**Dato fuera de rango:** ${invalid.reason}\n\n` +
    `Valor indicado: ${invalid.value}\n\n` +
    "Por favor, verifica e indica el valor correcto."
  );
}
/**
 * Genera mensaje amigable para estado conflictivo
 *
 * @param result - Resultado de clasificacion
 * @returns Mensaje para mostrar al usuario
 */
export function buildConflictMessage(
  result: DataClassificationResult,
): string {
  const conflict = result.conflictingVariables[0];

  return (
    `**Datos inconsistentes:** ${conflict.reason}\n\n` +
    "Por favor, confirma cual es la situacion correcta."
  );
}
