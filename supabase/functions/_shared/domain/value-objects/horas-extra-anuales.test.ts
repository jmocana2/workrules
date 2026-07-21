// supabase/functions/_shared/domain/value-objects/horas-extra-anuales.test.ts

import { assertEquals } from "@std/assert";
import {
  HorasExtraAnuales,
  makeHorasExtraAnuales,
} from "./horas-extra-anuales.ts";

Deno.test("makeHorasExtraAnuales - mínimo (0)", () => {
  assertEquals(makeHorasExtraAnuales(0), {
    ok: true,
    value: 0 as HorasExtraAnuales,
  });
});

Deno.test("makeHorasExtraAnuales - máximo legal (80)", () => {
  assertEquals(makeHorasExtraAnuales(80), {
    ok: true,
    value: 80 as HorasExtraAnuales,
  });
});

Deno.test("makeHorasExtraAnuales - valor intermedio (40)", () => {
  assertEquals(makeHorasExtraAnuales(40), {
    ok: true,
    value: 40 as HorasExtraAnuales,
  });
});

Deno.test("makeHorasExtraAnuales - negativo", () => {
  assertEquals(makeHorasExtraAnuales(-1), {
    ok: false,
    error: { kind: "below_minimum", min: 0 },
  });
});

Deno.test("makeHorasExtraAnuales - por encima del máximo (81)", () => {
  assertEquals(makeHorasExtraAnuales(81), {
    ok: false,
    error: { kind: "above_legal_max", max: 80, source: "Art. 35.2 ET" },
  });
});

Deno.test("makeHorasExtraAnuales - decimal rechazado (10.5)", () => {
  assertEquals(makeHorasExtraAnuales(10.5), {
    ok: false,
    error: { kind: "not_integer" },
  });
});

Deno.test("makeHorasExtraAnuales - NaN", () => {
  assertEquals(makeHorasExtraAnuales(Number.NaN), {
    ok: false,
    error: { kind: "not_finite" },
  });
});

Deno.test("makeHorasExtraAnuales - Infinity", () => {
  assertEquals(makeHorasExtraAnuales(Number.POSITIVE_INFINITY), {
    ok: false,
    error: { kind: "not_finite" },
  });
});
