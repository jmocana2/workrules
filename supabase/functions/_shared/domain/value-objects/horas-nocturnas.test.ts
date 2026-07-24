// supabase/functions/_shared/domain/value-objects/horas-nocturnas.test.ts

import { assertEquals } from "@std/assert";
import { HorasNocturnas, makeHorasNocturnas } from "./horas-nocturnas.ts";

Deno.test("makeHorasNocturnas - cero permitido", () => {
  assertEquals(makeHorasNocturnas(0), {
    ok: true,
    value: 0 as HorasNocturnas,
  });
});

Deno.test("makeHorasNocturnas - valor entero (8)", () => {
  assertEquals(makeHorasNocturnas(8), {
    ok: true,
    value: 8 as HorasNocturnas,
  });
});

Deno.test("makeHorasNocturnas - fracción admitida (2.5)", () => {
  assertEquals(makeHorasNocturnas(2.5), {
    ok: true,
    value: 2.5 as HorasNocturnas,
  });
});

Deno.test("makeHorasNocturnas - valor grande no acotado localmente (500)", () => {
  // La invariante `≤ horasSemanales * 52` vive en ChatCommand.
  assertEquals(makeHorasNocturnas(500), {
    ok: true,
    value: 500 as HorasNocturnas,
  });
});

Deno.test("makeHorasNocturnas - negativo", () => {
  assertEquals(makeHorasNocturnas(-1), {
    ok: false,
    error: { kind: "below_minimum", min: 0 },
  });
});

Deno.test("makeHorasNocturnas - NaN", () => {
  assertEquals(makeHorasNocturnas(Number.NaN), {
    ok: false,
    error: { kind: "not_finite" },
  });
});

Deno.test("makeHorasNocturnas - Infinity", () => {
  assertEquals(makeHorasNocturnas(Number.POSITIVE_INFINITY), {
    ok: false,
    error: { kind: "not_finite" },
  });
});
