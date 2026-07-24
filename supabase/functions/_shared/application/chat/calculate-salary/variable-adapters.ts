/**
 * Adaptadores puros entre el modelo interno de variables extraídas y las
 * formas que consumen el frontend (chips activos) y el prompt (Record plano).
 *
 * - `buildResolvedVariables`: devuelve las variables del perfil con sus claves
 *   crudas (ej: "categoria_profesional") para que el panel del front las
 *   mergee directamente en `activeVariables` sin mantener un mapeo inverso.
 *   Sólo incluye variables críticas del perfil que tengan valor string no vacío.
 * - `variablesToRecord`: aplana `ExtractedVariables` a `Record<string, string>`
 *   omitiendo `undefined`, listo para el `buildUserMessage` del prompt.
 */

import type { ExtractedVariables } from "../types.ts";
import { resolveVariableKey } from "../variable-extractor.ts";
import type { ExtractedVariablesVO } from "../../../domain/chat-command/chat-command.ts";

/**
 * Convierte los VOs de `ChatCommand.variables` al `ExtractedVariables` (Record
 * plano) que el pipeline interno de `calculate-salary` sigue consumiendo.
 * Es el borde de entrada al pipeline legacy — cuando fase 9 colapse la
 * extracción a VO end-to-end, este helper desaparece.
 */
export function voToExtractedVariables(
  vo: ExtractedVariablesVO | undefined,
): ExtractedVariables {
  const out: ExtractedVariables = {};
  if (!vo) return out;
  // Extras primero para que los campos VO puedan sobrescribir si hay colisión
  // (no debería, pero es más seguro). Se normalizan a claves canónicas para
  // que `checkMissingVariables` las case con `variables_criticas` del perfil.
  if (vo.extras) {
    for (const [key, value] of Object.entries(vo.extras)) {
      const canonical = resolveVariableKey(key);
      out[canonical] = value;
    }
  }
  if (vo.categoria !== undefined) out.categoria = vo.categoria;
  if (vo.horasSemanales !== undefined) {
    out.horasSemanales = vo.horasSemanales as unknown as number;
  }
  if (vo.jornada !== undefined) {
    out.jornada = vo.jornada.tipo;
    // jornada.horas === vo.horasSemanales por construcción cuando ambos vienen.
    out.horasSemanales = vo.jornada.horas as unknown as number;
  }
  if (vo.horasExtraAnuales !== undefined) {
    out.horasExtra = vo.horasExtraAnuales as unknown as number;
  }
  if (vo.horasNocturnas !== undefined) {
    out.horasNocturnas = vo.horasNocturnas as unknown as number;
  }
  if (vo.antiguedadAnos !== undefined) {
    out.antiguedadAnos = vo.antiguedadAnos as unknown as number;
  }
  return out;
}

export function buildResolvedVariables(
  allVariables: ExtractedVariables,
  perfil: { variables_criticas: string[] } | null,
): Record<string, string> {
  if (!perfil) return {};
  const out: Record<string, string> = {};
  for (const varCritica of perfil.variables_criticas) {
    const canonical = resolveVariableKey(varCritica);
    const value = allVariables[canonical];
    if (typeof value === "string" && value.length > 0) {
      out[varCritica] = value;
    }
  }
  return out;
}

export function variablesToRecord(
  variables: ExtractedVariables,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(variables)) {
    if (value !== undefined) {
      result[key] = String(value);
    }
  }
  return result;
}
