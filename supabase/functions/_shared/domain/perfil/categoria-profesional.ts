// supabase/functions/_shared/domain/perfil/categoria-profesional.ts
//
// Categoría profesional dentro de un perfil. Valida nombre no vacío y
// sinónimos no vacíos individualmente (permitir un array vacío global).
// La unicidad por convenio se delega al agregado `Perfil`.

import { err, ok, Result } from "../result.ts";

export type CategoriaProfesional = {
  readonly nombre: string;
  readonly sinonimos: readonly string[];
  readonly grupo?: string;
  readonly nivel?: string;
  readonly areaFuncional?: string;
  readonly salarios?: Readonly<Record<string, number>>;
  readonly salarioBaseAnual?: number;
  readonly salarioBaseMensual?: number;
  readonly __brand: "CategoriaProfesional";
};

export type CategoriaProfesionalError =
  | { kind: "invalid_type" }
  | { kind: "nombre_empty" }
  | { kind: "sinonimo_empty"; index: number }
  | { kind: "invalid_salarios_type" };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function validateSinonimos(
  raw: unknown,
): Result<readonly string[], CategoriaProfesionalError> {
  if (raw === undefined || raw === null) return ok([]);
  if (!Array.isArray(raw)) return err({ kind: "invalid_type" });
  for (let i = 0; i < raw.length; i++) {
    const s = raw[i];
    if (typeof s !== "string" || s.trim().length === 0) {
      return err({ kind: "sinonimo_empty", index: i });
    }
  }
  return ok(raw as string[]);
}

function validateSalarios(
  raw: unknown,
): Result<Record<string, number> | undefined, CategoriaProfesionalError> {
  if (raw === undefined) return ok(undefined);
  if (!isRecord(raw)) return err({ kind: "invalid_salarios_type" });
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v !== "number" || !Number.isFinite(v)) {
      return err({ kind: "invalid_salarios_type" });
    }
    result[k] = v;
  }
  return ok(result);
}

/**
 * Construye una `CategoriaProfesional` desde el JSON crudo del indexer.
 */
export function makeCategoriaProfesional(
  raw: unknown,
): Result<CategoriaProfesional, CategoriaProfesionalError> {
  if (!isRecord(raw)) return err({ kind: "invalid_type" });

  const nombre = raw.nombre;
  if (typeof nombre !== "string" || nombre.trim().length === 0) {
    return err({ kind: "nombre_empty" });
  }

  const sinonimosResult = validateSinonimos(raw.sinonimos);
  if (!sinonimosResult.ok) return sinonimosResult;

  const salariosResult = validateSalarios(raw.salarios);
  if (!salariosResult.ok) return salariosResult;

  return ok({
    nombre: nombre.trim(),
    sinonimos: sinonimosResult.value,
    grupo: typeof raw.grupo === "string" ? raw.grupo : undefined,
    nivel: typeof raw.nivel === "string" ? raw.nivel : undefined,
    areaFuncional: typeof raw.area_funcional === "string"
      ? raw.area_funcional
      : undefined,
    salarios: salariosResult.value,
    salarioBaseAnual: typeof raw.salario_base_anual === "number"
      ? raw.salario_base_anual
      : undefined,
    salarioBaseMensual: typeof raw.salario_base_mensual === "number"
      ? raw.salario_base_mensual
      : undefined,
    __brand: "CategoriaProfesional",
  } as CategoriaProfesional);
}
