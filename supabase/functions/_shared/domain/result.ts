// supabase/functions/_shared/domain/result.ts
//
// Result<T, E> — contenedor funcional para éxito/error.
//
// Contrato de la capa `domain/`: NINGUNA función de este directorio lanza
// excepciones. Todo error de dominio se devuelve como `Err<E>` con `kind`
// discriminado. El caller decide qué hacer (mapear a HTTP, componer, etc.).
//
// Este módulo no importa nada fuera de `domain/`.

export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E> = Ok<T> | Err<E>;

export function ok<T, E = never>(value: T): Result<T, E> {
  return { ok: true, value };
}

export function err<E, T = never>(error: E): Result<T, E> {
  return { ok: false, error };
}

export function isOk<T, E>(r: Result<T, E>): r is Ok<T> {
  return r.ok === true;
}

export function isErr<T, E>(r: Result<T, E>): r is Err<E> {
  return r.ok === false;
}

export function map<T, U, E>(
  r: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> {
  return r.ok ? ok(fn(r.value)) : r;
}

export function chain<T, U, E>(
  r: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  return r.ok ? fn(r.value) : r;
}

export function mapErr<T, E, F>(
  r: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> {
  return r.ok ? r : err(fn(r.error));
}

export function unwrapOr<T, E>(r: Result<T, E>, fallback: T): T {
  return r.ok ? r.value : fallback;
}
