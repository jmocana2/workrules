// supabase/functions/_shared/domain/value-objects/jornada.test.ts

import { assertEquals } from "@std/assert";
import { HorasSemanales, makeHorasSemanales } from "./horas-semanales.ts";
import { Jornada, makeJornada } from "./jornada.ts";

function horas(n: number): HorasSemanales {
  const r = makeHorasSemanales(n);
  if (!r.ok) throw new Error(`fixture inválido: ${n}`);
  return r.value;
}

Deno.test("makeJornada - completa con 35h (mínimo) ✅", () => {
  const r = makeJornada("completa", horas(35));
  assertEquals(r.ok, true);
  if (r.ok) {
    assertEquals(r.value.tipo, "completa");
    assertEquals(r.value.horas, 35);
  }
});

Deno.test("makeJornada - completa con 40h ✅", () => {
  const r = makeJornada("completa", horas(40));
  assertEquals(r.ok, true);
});

Deno.test("makeJornada - completa con 30h ❌", () => {
  assertEquals(makeJornada("completa", horas(30)), {
    ok: false,
    error: { kind: "completa_con_horas_bajas", horas: 30, minimo: 35 },
  });
});

Deno.test("makeJornada - parcial con 20h ✅", () => {
  const r = makeJornada("parcial", horas(20));
  assertEquals(r.ok, true);
  if (r.ok) assertEquals(r.value.tipo, "parcial");
});

Deno.test("makeJornada - parcial con 39.5h ✅ (justo por debajo del umbral)", () => {
  const r = makeJornada("parcial", horas(39.5));
  assertEquals(r.ok, true);
});

Deno.test("makeJornada - parcial con 40h ❌", () => {
  assertEquals(makeJornada("parcial", horas(40)), {
    ok: false,
    error: { kind: "parcial_con_horas_completas", horas: 40, umbral: 40 },
  });
});

Deno.test("makeJornada - Jornada construida es del tipo brand", () => {
  const r = makeJornada("completa", horas(38));
  if (!r.ok) throw new Error("debería construirse");
  // Compilación implícita: `r.value` es asignable a Jornada
  const j: Jornada = r.value;
  assertEquals(j.__brand, "Jornada");
});
