// supabase/functions/_shared/domain/perfil/perfil.ts
//
// Agregado del perfil de un convenio. Es la ANTI-CORRUPTION LAYER contra
// el JSON producido por el indexer n8n: todo lo que entra pasa por aquí
// antes de ser usado por el use case.
//
// Invariantes:
//   1. `variables_criticas.length ≥ 1`.
//   2. Cada clave de `valores_posibles` referencia una variable crítica
//      (por nombre exacto o por su forma normalizada).
//   3. Los nombres de `categorias_profesionales` son únicos.

import { err, ok, Result } from "../result.ts";
import {
  CategoriaProfesional,
  CategoriaProfesionalError,
  makeCategoriaProfesional,
} from "./categoria-profesional.ts";
import {
  makeVariableCritica,
  normalizeNombre,
  VariableCritica,
  VariableCriticaError,
} from "./variable-critica.ts";

export type Perfil = {
  readonly variablesCriticas: readonly VariableCritica[];
  readonly categoriasProfesionales: readonly CategoriaProfesional[];
  readonly valoresPosibles: Readonly<Record<string, readonly string[]>>;
  readonly areasFuncionales: readonly string[];
  readonly mapeoEstablecimientos: Readonly<Record<string, string>>;
  readonly numeroPagas?: number;
  readonly __brand: "Perfil";
};

export type PerfilError =
  | { kind: "invalid_type" }
  | { kind: "variables_criticas_missing" }
  | { kind: "variables_criticas_empty" }
  | { kind: "variable_critica_invalid"; index: number; cause: VariableCriticaError }
  | { kind: "categoria_invalid"; index: number; cause: CategoriaProfesionalError }
  | { kind: "categoria_duplicated"; nombre: string }
  | { kind: "valores_posibles_invalid_type" }
  | {
    kind: "valor_posible_no_critica";
    clave: string;
    criticasConocidas: readonly string[];
  }
  | { kind: "valor_posible_invalid_value"; clave: string; index: number };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function buildVariablesCriticas(
  raw: unknown,
): Result<VariableCritica[], PerfilError> {
  if (raw === undefined) return err({ kind: "variables_criticas_missing" });
  if (!Array.isArray(raw)) return err({ kind: "variables_criticas_missing" });
  if (raw.length === 0) return err({ kind: "variables_criticas_empty" });

  const out: VariableCritica[] = [];
  for (let i = 0; i < raw.length; i++) {
    const vRes = makeVariableCritica(raw[i]);
    if (!vRes.ok) {
      return err({
        kind: "variable_critica_invalid",
        index: i,
        cause: vRes.error,
      });
    }
    out.push(vRes.value);
  }
  return ok(out);
}

function buildCategorias(
  raw: unknown,
): Result<CategoriaProfesional[], PerfilError> {
  if (raw === undefined || raw === null) return ok([]);
  if (!Array.isArray(raw)) return err({ kind: "invalid_type" });

  const out: CategoriaProfesional[] = [];
  const nombresVistos = new Set<string>();
  for (let i = 0; i < raw.length; i++) {
    const cRes = makeCategoriaProfesional(raw[i]);
    if (!cRes.ok) {
      return err({ kind: "categoria_invalid", index: i, cause: cRes.error });
    }
    const clave = cRes.value.nombre.toLowerCase();
    if (nombresVistos.has(clave)) {
      return err({ kind: "categoria_duplicated", nombre: cRes.value.nombre });
    }
    nombresVistos.add(clave);
    out.push(cRes.value);
  }
  return ok(out);
}

function buildValoresPosibles(
  raw: unknown,
  criticas: readonly VariableCritica[],
): Result<Record<string, string[]>, PerfilError> {
  if (raw === undefined || raw === null) return ok({});
  if (!isRecord(raw)) return err({ kind: "valores_posibles_invalid_type" });

  const criticasNombres = criticas.map((v) => v.nombre);
  const criticasSet = new Set(criticasNombres);
  const out: Record<string, string[]> = {};

  for (const [clave, valores] of Object.entries(raw)) {
    const claveNormalizada = normalizeNombre(clave);
    if (!criticasSet.has(claveNormalizada)) {
      return err({
        kind: "valor_posible_no_critica",
        clave,
        criticasConocidas: criticasNombres,
      });
    }
    if (!Array.isArray(valores)) {
      return err({ kind: "valores_posibles_invalid_type" });
    }
    for (let i = 0; i < valores.length; i++) {
      const v = valores[i];
      if (typeof v !== "string" || v.trim().length === 0) {
        return err({ kind: "valor_posible_invalid_value", clave, index: i });
      }
    }
    out[clave] = valores as string[];
  }
  return ok(out);
}

function buildStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === "string" && v.length > 0);
}

function buildStringRecord(raw: unknown): Record<string, string> {
  if (!isRecord(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

/**
 * Construye un `Perfil` validado desde el JSON crudo del indexer.
 * Falla en construcción si alguna invariante se rompe, evitando que el
 * use case reciba un perfil corrupto.
 */
export function makePerfil(raw: unknown): Result<Perfil, PerfilError> {
  if (!isRecord(raw)) return err({ kind: "invalid_type" });

  const criticasRes = buildVariablesCriticas(raw.variables_criticas);
  if (!criticasRes.ok) return criticasRes;

  const categoriasRes = buildCategorias(raw.categorias_profesionales);
  if (!categoriasRes.ok) return categoriasRes;

  const valoresRes = buildValoresPosibles(
    raw.valores_posibles,
    criticasRes.value,
  );
  if (!valoresRes.ok) return valoresRes;

  return ok({
    variablesCriticas: criticasRes.value,
    categoriasProfesionales: categoriasRes.value,
    valoresPosibles: valoresRes.value,
    areasFuncionales: buildStringArray(raw.areas_funcionales),
    mapeoEstablecimientos: buildStringRecord(raw.mapeo_establecimientos),
    numeroPagas: typeof raw.numero_pagas === "number"
      ? raw.numero_pagas
      : undefined,
    __brand: "Perfil",
  } as Perfil);
}
