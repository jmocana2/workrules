// supabase/functions/_shared/domain/value-objects/jornada.ts
//
// VO compuesto: encapsula la relación entre el tipo de jornada declarado y
// las horas semanales. La invariante `completa ⇒ horas ≥ 35` y su recíproca
// `parcial ⇒ horas < 40` viven aquí (antes en `checkConflicts` del
// data-classifier).

import { err, ok, Result } from "../result.ts";
import { HorasSemanales } from "./horas-semanales.ts";

export type TipoJornada = "completa" | "parcial";

export type Jornada = {
  readonly tipo: TipoJornada;
  readonly horas: HorasSemanales;
  readonly __brand: "Jornada";
};

export type JornadaError =
  | { kind: "completa_con_horas_bajas"; horas: number; minimo: 35 }
  | { kind: "parcial_con_horas_completas"; horas: number; umbral: 40 };

/**
 * Construye una `Jornada` coherente. Las horas ya deben venir validadas como
 * `HorasSemanales`; aquí solo se comprueba la invariante compuesta.
 *
 * - `completa` requiere `horas ≥ 35`.
 * - `parcial` requiere `horas < 40`.
 */
export function makeJornada(
  tipo: TipoJornada,
  horas: HorasSemanales,
): Result<Jornada, JornadaError> {
  if (tipo === "completa" && horas < 35) {
    return err({ kind: "completa_con_horas_bajas", horas, minimo: 35 });
  }
  if (tipo === "parcial" && horas >= 40) {
    return err({ kind: "parcial_con_horas_completas", horas, umbral: 40 });
  }
  return ok({ tipo, horas, __brand: "Jornada" } as Jornada);
}
