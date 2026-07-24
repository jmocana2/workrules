// supabase/functions/_shared/domain/perfil/variable-critica.test.ts

import { assertEquals } from "@std/assert";
import {
  isIdentifying,
  makeVariableCritica,
  normalizeNombre,
} from "./variable-critica.ts";

Deno.test("normalizeNombre - lowercase + sin acentos + snake_case", () => {
  assertEquals(normalizeNombre("Área Funcional"), "area_funcional");
  assertEquals(normalizeNombre("  Categoría  "), "categoria");
});

Deno.test("makeVariableCritica - identificadora: 'categoria'", () => {
  const r = makeVariableCritica("categoria");
  assertEquals(r.ok, true);
  if (r.ok) {
    assertEquals(r.value.nombre, "categoria");
    assertEquals(r.value.clase, "identificadora");
    assertEquals(isIdentifying(r.value), true);
  }
});

Deno.test("makeVariableCritica - identificadora: 'Tipo de Establecimiento'", () => {
  const r = makeVariableCritica("Tipo de Establecimiento");
  assertEquals(r.ok, true);
  if (r.ok) {
    assertEquals(r.value.clase, "identificadora");
  }
});

Deno.test("makeVariableCritica - moduladora: 'jornada'", () => {
  const r = makeVariableCritica("jornada");
  assertEquals(r.ok, true);
  if (r.ok) {
    assertEquals(r.value.clase, "moduladora");
    assertEquals(isIdentifying(r.value), false);
  }
});

Deno.test("makeVariableCritica - moduladora: 'antigüedad'", () => {
  const r = makeVariableCritica("antigüedad");
  assertEquals(r.ok, true);
  if (r.ok) {
    assertEquals(r.value.nombre, "antiguedad");
    assertEquals(r.value.clase, "moduladora");
  }
});

Deno.test("makeVariableCritica - string vacío devuelve empty", () => {
  assertEquals(makeVariableCritica(""), {
    ok: false,
    error: { kind: "empty" },
  });
});

Deno.test("makeVariableCritica - tipo no string devuelve invalid_type", () => {
  assertEquals(makeVariableCritica(42), {
    ok: false,
    error: { kind: "invalid_type" },
  });
  assertEquals(makeVariableCritica(null), {
    ok: false,
    error: { kind: "invalid_type" },
  });
});

Deno.test("makeVariableCritica - 'tarea' NO matchea 'area' (token completo)", () => {
  const r = makeVariableCritica("tarea");
  assertEquals(r.ok, true);
  if (r.ok) assertEquals(r.value.clase, "moduladora");
});

Deno.test("makeVariableCritica - 'impuesto' NO matchea 'puesto'", () => {
  const r = makeVariableCritica("impuesto");
  assertEquals(r.ok, true);
  if (r.ok) assertEquals(r.value.clase, "moduladora");
});

Deno.test("makeVariableCritica - 'presupuesto' NO matchea 'puesto'", () => {
  const r = makeVariableCritica("presupuesto");
  assertEquals(r.ok, true);
  if (r.ok) assertEquals(r.value.clase, "moduladora");
});
