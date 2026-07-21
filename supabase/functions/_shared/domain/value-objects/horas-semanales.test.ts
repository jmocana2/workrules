// supabase/functions/_shared/domain/value-objects/horas-semanales.test.ts

import { assertEquals } from "@std/assert";
import { HorasSemanales, makeHorasSemanales } from "./horas-semanales.ts";

Deno.test("makeHorasSemanales - valor mínimo (1)", () => {
  assertEquals(makeHorasSemanales(1), { ok: true, value: 1 as HorasSemanales });
});

Deno.test("makeHorasSemanales - valor máximo legal (40)", () => {
  assertEquals(makeHorasSemanales(40), { ok: true, value: 40 as HorasSemanales });
});

Deno.test("makeHorasSemanales - media hora (37.5)", () => {
  assertEquals(makeHorasSemanales(37.5), {
    ok: true,
    value: 37.5 as HorasSemanales,
  });
});

Deno.test("makeHorasSemanales - por debajo del mínimo (0.5)", () => {
  assertEquals(makeHorasSemanales(0.5), {
    ok: false,
    error: { kind: "below_minimum", min: 1 },
  });
});

Deno.test("makeHorasSemanales - negativo", () => {
  assertEquals(makeHorasSemanales(-5), {
    ok: false,
    error: { kind: "below_minimum", min: 1 },
  });
});

Deno.test("makeHorasSemanales - por encima del máximo legal (40.5)", () => {
  assertEquals(makeHorasSemanales(40.5), {
    ok: false,
    error: { kind: "above_legal_max", max: 40, source: "Art. 34.1 ET" },
  });
});

Deno.test("makeHorasSemanales - fracción no múltiplo de 0.5 (37.25)", () => {
  assertEquals(makeHorasSemanales(37.25), {
    ok: false,
    error: { kind: "not_half_hour_step" },
  });
});

Deno.test("makeHorasSemanales - NaN", () => {
  assertEquals(makeHorasSemanales(Number.NaN), {
    ok: false,
    error: { kind: "not_finite" },
  });
});

Deno.test("makeHorasSemanales - Infinity", () => {
  assertEquals(makeHorasSemanales(Number.POSITIVE_INFINITY), {
    ok: false,
    error: { kind: "not_finite" },
  });
});
