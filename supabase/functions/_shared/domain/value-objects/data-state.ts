// supabase/functions/_shared/domain/value-objects/data-state.ts
//
// Máquina de estados del ciclo de vida de las variables del usuario en un
// cálculo salarial. La precedencia fija (invalid > conflicting > incomplete >
// complete) reemplaza la cadena de `if/else` de `data-classifier.determineState`.

export type DataStateKind =
  | "invalid"
  | "conflicting"
  | "incomplete"
  | "complete";

export type DataState = {
  readonly kind: DataStateKind;
  readonly __brand: "DataState";
};

/**
 * Entrada declarativa de las cuatro señales que la clasificación puede
 * levantar. Números en lugar de booleanos para conservar la información de
 * cuántos elementos hay, útil para los mensajes de error del use case.
 */
export type DataStateChecks = {
  readonly invalidCount: number;
  readonly conflictingCount: number;
  readonly missingCount: number;
};

function build(kind: DataStateKind): DataState {
  return { kind, __brand: "DataState" };
}

/**
 * Deriva el `DataState` aplicando la precedencia:
 * `invalid > conflicting > incomplete > complete`.
 */
export function fromChecks(checks: DataStateChecks): DataState {
  if (checks.invalidCount > 0) return build("invalid");
  if (checks.conflictingCount > 0) return build("conflicting");
  if (checks.missingCount > 0) return build("incomplete");
  return build("complete");
}
