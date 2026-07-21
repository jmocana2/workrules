// supabase/functions/_shared/domain/value-objects/query-intent.test.ts

import { assertEquals } from "@std/assert";
import { classifyQueryIntent } from "./query-intent.ts";

Deno.test("classifyQueryIntent - 'cuanto cobra un camarero' → salary", () => {
  assertEquals(
    classifyQueryIntent("cuanto cobra un camarero", false).kind,
    "salary_calculation",
  );
});

Deno.test("classifyQueryIntent - 'calculame el salario' → salary", () => {
  assertEquals(
    classifyQueryIntent("calculame el salario", false).kind,
    "salary_calculation",
  );
});

Deno.test("classifyQueryIntent - 'plus de nocturnidad' → salary", () => {
  assertEquals(
    classifyQueryIntent("plus de nocturnidad", false).kind,
    "salary_calculation",
  );
});

Deno.test("classifyQueryIntent - 'que dice el articulo 14' → informational", () => {
  assertEquals(
    classifyQueryIntent("que dice el articulo 14", false).kind,
    "informational",
  );
});

Deno.test("classifyQueryIntent - 'cuantos dias de vacaciones' → informational", () => {
  assertEquals(
    classifyQueryIntent("cuantos dias de vacaciones tengo", false).kind,
    "informational",
  );
});

Deno.test("classifyQueryIntent - 'como funciona el despido' → informational", () => {
  assertEquals(
    classifyQueryIntent("como funciona el despido", false).kind,
    "informational",
  );
});

Deno.test("classifyQueryIntent - hasProfileData=true fuerza salary si no es informativa", () => {
  // "Soy camarero" sin hasProfileData sería informativa; con hasProfileData
  // (respuesta a DataRequestCard) se interpreta como continuación de cálculo.
  assertEquals(
    classifyQueryIntent("soy camarero", true).kind,
    "salary_calculation",
  );
});

Deno.test("classifyQueryIntent - hasProfileData=true NO fuerza salary si es informativa explícita", () => {
  assertEquals(
    classifyQueryIntent("que dice el articulo 14", true).kind,
    "informational",
  );
});

Deno.test("classifyQueryIntent - mensaje neutro sin datos → informational (default)", () => {
  assertEquals(
    classifyQueryIntent("hola", false).kind,
    "informational",
  );
});

Deno.test("classifyQueryIntent - normaliza acentos ('cuánto cobra')", () => {
  assertEquals(
    classifyQueryIntent("cuánto cobra un cocinero", false).kind,
    "salary_calculation",
  );
});
