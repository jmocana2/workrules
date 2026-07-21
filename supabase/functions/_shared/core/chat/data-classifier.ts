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
import {
  normalizeVariableName,
  resolveVariableKey,
} from "./variable-extractor.ts";

// ============================================
// LIMITES LEGALES
// ============================================
export {
  LEGAL_LIMITS,
  SMI_2026,
  type SMIValidationResult,
  validateAgainstSMI,
} from "../../domain/labor-law/index.ts";

import { LEGAL_LIMITS } from "../../domain/labor-law/index.ts";

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
    missingModulators: [],
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
/**
 * Decide si una variable critica es "identificadora": sin ella no se puede
 * aplicar una tabla salarial concreta (categoria, nivel/tipo establecimiento,
 * zona/ambito, grupo, area). Las moduladoras (jornada, antiguedad, turno,
 * horas extra, pluses) NO bloquean: Claude asume default.
 *
 * Debe coincidir con el helper del front (useChatPage.isIdentifyingVariable).
 */
export function isIdentifyingCritical(varCritica: string): boolean {
  const normalized = normalizeVariableName(varCritica).replace(/_/g, " ");
  const keywords = [
    "categoria",
    "puesto",
    "nivel",
    "tipo de establecimiento",
    "tipo establecimiento",
    "clase",
    "zona",
    "ambito",
    "grupo",
    "area",
  ];
  return keywords.some((kw) => normalized.includes(kw));
}

function collectSuggestionsForVariable(
  varCritica: string,
  key: string,
  perfil: PerfilContexto,
): string[] | undefined {
  const normalizedCritica = normalizeVariableName(varCritica);

  if (
    (key === "categoria" || normalizedCritica.includes("categoria")) &&
    perfil.categorias_profesionales
  ) {
    return perfil.categorias_profesionales.map((c) => c.nombre);
  }

  const valoresPosibles = perfil.valores_posibles;
  if (!valoresPosibles) return undefined;

  const opciones = valoresPosibles[varCritica] ??
    valoresPosibles[normalizedCritica] ??
    valoresPosibles[normalizedCritica.replace(/_/g, " ")] ??
    valoresPosibles[key];

  return opciones && opciones.length > 0 ? opciones : undefined;
}

function registerMissingVariable(
  varCritica: string,
  key: string,
  perfil: PerfilContexto,
  result: DataClassificationResult,
): void {
  const isIdentifying = isIdentifyingCritical(varCritica);

  if (isIdentifying) {
    result.missingVariables.push(varCritica);
  } else {
    result.missingModulators ??= [];
    result.missingModulators.push(varCritica);
    return;
  }

  const suggestions = collectSuggestionsForVariable(varCritica, key, perfil);
  if (suggestions) {
    result.suggestions[varCritica] = suggestions;
  }
}

function checkMissingVariables(
  variables: ExtractedVariables,
  perfil: PerfilContexto,
  result: DataClassificationResult,
): void {
  const variablesCriticas = perfil.variables_criticas || [];

  for (const varCritica of variablesCriticas) {
    const key = resolveVariableKey(varCritica);
    if (variables[key] !== undefined) continue;
    registerMissingVariable(varCritica, key, perfil, result);
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

// ============================================
// VALIDACION SMI
// ============================================
// `SMIValidationResult` y `validateAgainstSMI` viven ahora en
// `domain/labor-law/smi.ts` y se reexportan en la cabecera de este fichero.
