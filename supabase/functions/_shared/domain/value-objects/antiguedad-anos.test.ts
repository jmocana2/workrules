// supabase/functions/_shared/domain/value-objects/antiguedad-anos.test.ts

import { assertEquals } from "@std/assert";
import { AntiguedadAnos, makeAntiguedadAnos } from "./antiguedad-anos.ts";

Deno.test("makeAntiguedadAnos - cero permitido", () => {
  assertEquals(makeAntiguedadAnos(0), {
    ok: true,
    value: 0 as AntiguedadAnos,
  });
});

Deno.test("makeAntiguedadAnos - máximo (50)", () => {
  assertEquals(makeAntiguedadAnos(50), {
    ok: true,
    value: 50 as AntiguedadAnos,
  });
});

Deno.test("makeAntiguedadAnos - medio año admitido (2.5)", () => {
  assertEquals(makeAntiguedadAnos(2.5), {
    ok: true,
    value: 2.5 as AntiguedadAnos,
  });
});

Deno.test("makeAntiguedadAnos - fracción no múltiplo de 0.5 (2.3)", () => {
  assertEquals(makeAntiguedadAnos(2.3), {
    ok: false,
    error: { kind: "not_half_year_step" },
  });
});

Deno.test("makeAntiguedadAnos - por encima del máximo (51)", () => {
  assertEquals(makeAntiguedadAnos(51), {
    ok: false,
    error: { kind: "above_maximum", max: 50 },
  });
});

Deno.test("makeAntiguedadAnos - negativo", () => {
  assertEquals(makeAntiguedadAnos(-0.5), {
    ok: false,
    error: { kind: "below_minimum", min: 0 },
  });
});

Deno.test("makeAntiguedadAnos - NaN", () => {
  assertEquals(makeAntiguedadAnos(Number.NaN), {
    ok: false,
    error: { kind: "not_finite" },
  });
});

Deno.test("makeAntiguedadAnos - Infinity", () => {
  assertEquals(makeAntiguedadAnos(Number.POSITIVE_INFINITY), {
    ok: false,
    error: { kind: "not_finite" },
  });
});
