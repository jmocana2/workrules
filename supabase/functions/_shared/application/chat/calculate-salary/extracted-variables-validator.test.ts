import { assertEquals } from "@std/assert";
import { validateExtractedFromText } from "./extracted-variables-validator.ts";

Deno.test("validateExtractedFromText - lista vacia si todo esta en rango", () => {
  const invalid = validateExtractedFromText({
    horasSemanales: 40,
    horasExtra: 50,
    horasNocturnas: 100,
    antiguedadAnos: 10,
  });
  assertEquals(invalid.length, 0);
});

Deno.test("validateExtractedFromText - horasSemanales > 40 rechazado", () => {
  const invalid = validateExtractedFromText({ horasSemanales: 50 });
  assertEquals(invalid.length, 1);
  assertEquals(invalid[0].name, "horasSemanales");
  assertEquals(invalid[0].reason, "horasSemanales_above_product_max");
});

Deno.test("validateExtractedFromText - horasSemanales < 1 rechazado", () => {
  const invalid = validateExtractedFromText({ horasSemanales: 0 });
  assertEquals(invalid[0].reason, "horasSemanales_below_minimum");
});

Deno.test("validateExtractedFromText - horasExtra > 80 rechazado", () => {
  const invalid = validateExtractedFromText({ horasExtra: 100 });
  assertEquals(invalid[0].name, "horasExtra");
  assertEquals(invalid[0].reason, "horasExtraAnuales_above_product_max");
});

Deno.test("validateExtractedFromText - horasExtra negativa rechazado", () => {
  const invalid = validateExtractedFromText({ horasExtra: -5 });
  assertEquals(invalid[0].reason, "horasExtraAnuales_below_minimum");
});

Deno.test("validateExtractedFromText - horasNocturnas negativas rechazadas", () => {
  const invalid = validateExtractedFromText({ horasNocturnas: -10 });
  assertEquals(invalid[0].name, "horasNocturnas");
});

Deno.test("validateExtractedFromText - antiguedad > 50 rechazada", () => {
  const invalid = validateExtractedFromText({ antiguedadAnos: 60 });
  assertEquals(invalid[0].name, "antiguedadAnos");
});

Deno.test("validateExtractedFromText - antiguedad negativa rechazada", () => {
  const invalid = validateExtractedFromText({ antiguedadAnos: -1 });
  assertEquals(invalid[0].name, "antiguedadAnos");
});

Deno.test("validateExtractedFromText - agrega multiples invalidos", () => {
  const invalid = validateExtractedFromText({
    horasSemanales: 50,
    horasExtra: 100,
  });
  assertEquals(invalid.length, 2);
});
