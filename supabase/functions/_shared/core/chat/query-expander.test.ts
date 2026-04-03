/**
 * Tests para query-expander.ts
 *
 * @module query-expander.test
 */

import { assertEquals } from "@std/assert";
import { expandQuery, hasExpandableTerms } from "./query-expander.ts";

// ============================================
// expandQuery
// ============================================

Deno.test("expandQuery - expande grupos profesionales", () => {
  const result = expandQuery("cuáles son los grupos profesionales");

  assertEquals(result.includes("grupos profesionales"), true);
  assertEquals(result.includes("niveles retributivos"), true);
  assertEquals(result.includes("categorías profesionales"), true);
});

Deno.test("expandQuery - expande grupo profesional singular", () => {
  const result = expandQuery("a qué grupo profesional pertenece un cocinero");

  assertEquals(result.includes("grupo profesional"), true);
  assertEquals(result.includes("nivel retributivo"), true);
});

Deno.test("expandQuery - expande horas extra", () => {
  const result = expandQuery("qué dice sobre horas extra");

  assertEquals(result.includes("horas extra"), true);
  assertEquals(result.includes("horas extraordinarias"), true);
});

Deno.test("expandQuery - expande nocturnidad", () => {
  const result = expandQuery("existe plus de nocturnidad");

  assertEquals(result.includes("nocturnidad"), true);
  assertEquals(result.includes("trabajo nocturno"), true);
});

Deno.test("expandQuery - expande vacaciones", () => {
  const result = expandQuery("cuántos días de vacaciones");

  assertEquals(result.includes("vacaciones"), true);
  assertEquals(result.includes("descanso anual"), true);
});

Deno.test("expandQuery - no duplica términos existentes", () => {
  const result = expandQuery(
    "niveles retributivos y categorías profesionales",
  );

  // No debe duplicar si ya están
  const count = (result.match(/niveles retributivos/g) || []).length;
  assertEquals(count, 1);
});

Deno.test("expandQuery - no modifica consulta sin términos expandibles", () => {
  const original = "qué dice el artículo 14 del convenio";
  const result = expandQuery(original);

  assertEquals(result, original);
});

Deno.test("expandQuery - limita expansiones a 5 máximo", () => {
  const original = "salario sueldo paga nocturnidad plus";
  const result = expandQuery(original);
  const appendedText = result.slice(original.length).trim();

  // Debe limitarse a las primeras 5 expansiones disponibles
  assertEquals(appendedText.includes("retribución"), true);
  assertEquals(appendedText.includes("remuneración"), true);
  assertEquals(appendedText.includes("salario base"), true);
  assertEquals(appendedText.includes("gratificación"), true);
  assertEquals(appendedText.includes("paga extraordinaria"), true);

  // La siguiente expansión posible ya no debe entrar por el límite de 5
  assertEquals(appendedText.includes("mensualidad"), false);
});

Deno.test("expandQuery - case insensitive", () => {
  const result = expandQuery("GRUPOS PROFESIONALES del convenio");

  assertEquals(result.includes("niveles retributivos"), true);
});

Deno.test("expandQuery - maneja términos acentuados", () => {
  const result = expandQuery("qué dice sobre la antigüedad y la indemnización");

  assertEquals(result.includes("trienios"), true);
  assertEquals(result.includes("compensación por despido"), true);
});

// ============================================
// hasExpandableTerms
// ============================================

Deno.test("hasExpandableTerms - detecta grupos profesionales", () => {
  assertEquals(hasExpandableTerms("cuáles son los grupos profesionales"), true);
});

Deno.test("hasExpandableTerms - detecta salario", () => {
  assertEquals(hasExpandableTerms("cuál es el salario de un camarero"), true);
});

Deno.test("hasExpandableTerms - detecta nocturnidad", () => {
  assertEquals(hasExpandableTerms("plus de nocturnidad"), true);
});

Deno.test("hasExpandableTerms - no detecta términos no expandibles", () => {
  assertEquals(hasExpandableTerms("qué dice el artículo 14"), false);
});

Deno.test("hasExpandableTerms - case insensitive", () => {
  assertEquals(hasExpandableTerms("GRUPOS PROFESIONALES"), true);
});

Deno.test("hasExpandableTerms - detecta términos acentuados", () => {
  assertEquals(hasExpandableTerms("cómo se calcula la indemnización"), true);
  assertEquals(hasExpandableTerms("cómo funciona la antigüedad"), true);
});
