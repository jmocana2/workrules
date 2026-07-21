// supabase/functions/_shared/domain/perfil/variable-critica.ts
//
// Variable declarada como "crítica" por el indexer n8n. Se normaliza a
// snake_case sin acentos y se clasifica en identificadora vs moduladora.
//
// Identificadora: sin ella no se puede aplicar una tabla salarial concreta
// (categoria, nivel, tipo de establecimiento, zona, grupo, area).
// Moduladora: modula el cálculo pero admite default (jornada, antiguedad,
// turno, horas extra, pluses).
//
// Elimina la función libre `isIdentifyingCritical` de data-classifier.

import { err, ok, Result } from "../result.ts";

export type ClaseVariable = "identificadora" | "moduladora";

export type VariableCritica = {
  readonly nombre: string;
  readonly clase: ClaseVariable;
  readonly __brand: "VariableCritica";
};

export type VariableCriticaError =
  | { kind: "empty" }
  | { kind: "invalid_type" };

const IDENTIFYING_KEYWORDS = [
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

/**
 * Normaliza un nombre de variable a snake_case sin acentos.
 */
export function normalizeNombre(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

function classify(nombreNormalizado: string): ClaseVariable {
  const legible = nombreNormalizado.replace(/_/g, " ");
  return IDENTIFYING_KEYWORDS.some((kw) => legible.includes(kw))
    ? "identificadora"
    : "moduladora";
}

/**
 * Construye una `VariableCritica` desde un nombre arbitrario del perfil JSON.
 * Normaliza y clasifica automáticamente.
 */
export function makeVariableCritica(
  raw: unknown,
): Result<VariableCritica, VariableCriticaError> {
  if (typeof raw !== "string") return err({ kind: "invalid_type" });
  const nombre = normalizeNombre(raw);
  if (nombre.length === 0) return err({ kind: "empty" });
  return ok({
    nombre,
    clase: classify(nombre),
    __brand: "VariableCritica",
  } as VariableCritica);
}

/**
 * True si la variable es identificadora (bloquea el cálculo si falta).
 */
export function isIdentifying(v: VariableCritica): boolean {
  return v.clase === "identificadora";
}
