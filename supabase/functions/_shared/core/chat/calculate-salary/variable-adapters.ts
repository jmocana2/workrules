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
