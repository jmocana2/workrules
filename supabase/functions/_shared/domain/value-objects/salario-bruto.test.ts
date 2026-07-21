// supabase/functions/_shared/domain/value-objects/salario-bruto.test.ts

import { assertEquals } from "@std/assert";
import { makeSalarioBruto, SalarioBruto } from "./salario-bruto.ts";

Deno.test("makeSalarioBruto - valor válido", () => {
  assertEquals(makeSalarioBruto(1500.5), {
    ok: true,
    value: 1500.5 as SalarioBruto,
  });
});

Deno.test("makeSalarioBruto - cero permitido", () => {
  assertEquals(makeSalarioBruto(0), { ok: true, value: 0 as SalarioBruto });
});

Deno.test("makeSalarioBruto - NaN interceptado (§5.4 análisis)", () => {
  assertEquals(makeSalarioBruto(Number.NaN), {
    ok: false,
    error: { kind: "not_finite" },
  });
});

Deno.test("makeSalarioBruto - Infinity interceptado", () => {
  assertEquals(makeSalarioBruto(Number.POSITIVE_INFINITY), {
    ok: false,
    error: { kind: "not_finite" },
  });
});

Deno.test("makeSalarioBruto - negativo rechazado", () => {
  assertEquals(makeSalarioBruto(-100), {
    ok: false,
    error: { kind: "negative" },
  });
});

Deno.test("makeSalarioBruto - redondeo a 2 decimales", () => {
  const r = makeSalarioBruto(1500.234);
  assertEquals(r.ok, true);
  if (r.ok) {
    assertEquals(Math.round(r.value * 100) / 100, r.value);
  }
});
