// supabase/functions/_shared/domain/value-objects/importe-euros.test.ts

import { assertEquals } from "@std/assert";
import {
  ImporteEuros,
  makeImporteEuros,
  makeImporteEurosFromEsString,
} from "./importe-euros.ts";

Deno.test("makeImporteEuros - cero permitido", () => {
  assertEquals(makeImporteEuros(0), { ok: true, value: 0 as ImporteEuros });
});

Deno.test("makeImporteEuros - valor con 2 decimales exactos", () => {
  assertEquals(makeImporteEuros(1234.56), {
    ok: true,
    value: 1234.56 as ImporteEuros,
  });
});

Deno.test("makeImporteEuros - redondeo bancario, empate a par bajo (1.005 → 1.00)", () => {
  assertEquals(makeImporteEuros(1.005), {
    ok: true,
    value: 1.0 as ImporteEuros,
  });
});

Deno.test("makeImporteEuros - redondeo bancario, empate a par alto (1.015 → 1.02)", () => {
  assertEquals(makeImporteEuros(1.015), {
    ok: true,
    value: 1.02 as ImporteEuros,
  });
});

Deno.test("makeImporteEuros - redondeo bancario, empate a par (1.025 → 1.02)", () => {
  assertEquals(makeImporteEuros(1.025), {
    ok: true,
    value: 1.02 as ImporteEuros,
  });
});

Deno.test("makeImporteEuros - redondeo bancario, empate a par alto (1.035 → 1.04)", () => {
  assertEquals(makeImporteEuros(1.035), {
    ok: true,
    value: 1.04 as ImporteEuros,
  });
});

Deno.test("makeImporteEuros - negativo rechazado", () => {
  assertEquals(makeImporteEuros(-0.01), {
    ok: false,
    error: { kind: "negative" },
  });
});

Deno.test("makeImporteEuros - NaN", () => {
  assertEquals(makeImporteEuros(Number.NaN), {
    ok: false,
    error: { kind: "not_finite" },
  });
});

Deno.test("makeImporteEuros - Infinity", () => {
  assertEquals(makeImporteEuros(Number.POSITIVE_INFINITY), {
    ok: false,
    error: { kind: "not_finite" },
  });
});

// ============================================
// PARSER es-ES
// ============================================

Deno.test("makeImporteEurosFromEsString - formato es-ES completo (1.234,56)", () => {
  assertEquals(makeImporteEurosFromEsString("1.234,56"), {
    ok: true,
    value: 1234.56 as ImporteEuros,
  });
});

Deno.test("makeImporteEurosFromEsString - sin separador de miles (1234,56)", () => {
  assertEquals(makeImporteEurosFromEsString("1234,56"), {
    ok: true,
    value: 1234.56 as ImporteEuros,
  });
});

Deno.test("makeImporteEurosFromEsString - entero sin decimales (1234)", () => {
  assertEquals(makeImporteEurosFromEsString("1234"), {
    ok: true,
    value: 1234 as ImporteEuros,
  });
});

Deno.test("makeImporteEurosFromEsString - punto de miles interpretado (1.234)", () => {
  assertEquals(makeImporteEurosFromEsString("1.234"), {
    ok: true,
    value: 1234 as ImporteEuros,
  });
});

Deno.test("makeImporteEurosFromEsString - en-US decimal (1234.56) también aceptado", () => {
  assertEquals(makeImporteEurosFromEsString("1234.56"), {
    ok: true,
    value: 1234.56 as ImporteEuros,
  });
});

Deno.test("makeImporteEurosFromEsString - string vacío", () => {
  assertEquals(makeImporteEurosFromEsString(""), {
    ok: false,
    error: { kind: "unparseable_es_string", raw: "" },
  });
});

Deno.test("makeImporteEurosFromEsString - texto no numérico", () => {
  assertEquals(makeImporteEurosFromEsString("mil euros"), {
    ok: false,
    error: { kind: "unparseable_es_string", raw: "mil euros" },
  });
});

Deno.test("makeImporteEurosFromEsString - '1.2' se interpreta como decimal en-US (1.20), no como miles corruptos", () => {
  assertEquals(makeImporteEurosFromEsString("1.2"), {
    ok: true,
    value: 1.2 as ImporteEuros,
  });
});

Deno.test("makeImporteEurosFromEsString - '1.2345' es decimal en-US y se redondea a 1.23", () => {
  assertEquals(makeImporteEurosFromEsString("1.2345"), {
    ok: true,
    value: 1.23 as ImporteEuros,
  });
});

Deno.test("makeImporteEurosFromEsString - puntos consecutivos rechazados (1..23)", () => {
  assertEquals(makeImporteEurosFromEsString("1..23"), {
    ok: false,
    error: { kind: "unparseable_es_string", raw: "1..23" },
  });
});

Deno.test("makeImporteEurosFromEsString - grupo de miles malformado rechazado (12.34.56)", () => {
  assertEquals(makeImporteEurosFromEsString("12.34.56"), {
    ok: false,
    error: { kind: "unparseable_es_string", raw: "12.34.56" },
  });
});
