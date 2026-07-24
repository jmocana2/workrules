// supabase/functions/_shared/domain/perfil/perfil.test.ts

import { assertEquals } from "@std/assert";
import { makePerfil } from "./perfil.ts";

const PERFIL_VALIDO_MINIMO = {
  variables_criticas: ["categoria", "jornada"],
};

const PERFIL_VALIDO_COMPLETO = {
  variables_criticas: ["categoria", "tipo_establecimiento", "jornada"],
  categorias_profesionales: [
    { nombre: "Camarero", sinonimos: ["Waiter"] },
    { nombre: "Cocinero" },
  ],
  valores_posibles: {
    categoria: ["Camarero", "Cocinero"],
    tipo_establecimiento: ["A", "B", "C"],
  },
  areas_funcionales: ["Cocina", "Sala"],
  numero_pagas: 14,
};

// ============================================
// Casos válidos
// ============================================

Deno.test("makePerfil - JSON mínimo válido (solo variables_criticas)", () => {
  const r = makePerfil(PERFIL_VALIDO_MINIMO);
  assertEquals(r.ok, true);
  if (r.ok) {
    assertEquals(r.value.variablesCriticas.length, 2);
    assertEquals(r.value.variablesCriticas[0].nombre, "categoria");
    assertEquals(r.value.variablesCriticas[0].clase, "identificadora");
    assertEquals(r.value.variablesCriticas[1].clase, "moduladora");
    assertEquals(r.value.categoriasProfesionales, []);
    assertEquals(r.value.valoresPosibles, {});
  }
});

Deno.test("makePerfil - JSON completo válido", () => {
  const r = makePerfil(PERFIL_VALIDO_COMPLETO);
  assertEquals(r.ok, true);
  if (r.ok) {
    assertEquals(r.value.variablesCriticas.length, 3);
    assertEquals(r.value.categoriasProfesionales.length, 2);
    assertEquals(r.value.numeroPagas, 14);
    assertEquals(r.value.areasFuncionales, ["Cocina", "Sala"]);
  }
});

// ============================================
// Invariante 1: variables_criticas.length ≥ 1
// ============================================

Deno.test("makePerfil - variables_criticas vacío rechazado", () => {
  assertEquals(makePerfil({ variables_criticas: [] }), {
    ok: false,
    error: { kind: "variables_criticas_empty" },
  });
});

Deno.test("makePerfil - variables_criticas ausente rechazado", () => {
  assertEquals(makePerfil({}), {
    ok: false,
    error: { kind: "variables_criticas_missing" },
  });
});

Deno.test("makePerfil - variables_criticas no-array rechazado", () => {
  assertEquals(makePerfil({ variables_criticas: "categoria" }), {
    ok: false,
    error: { kind: "variables_criticas_missing" },
  });
});

Deno.test("makePerfil - variable crítica no-string rechazada", () => {
  const r = makePerfil({ variables_criticas: ["categoria", 42] });
  assertEquals(r.ok, false);
  if (!r.ok && r.error.kind === "variable_critica_invalid") {
    assertEquals(r.error.index, 1);
    assertEquals(r.error.cause, { kind: "invalid_type" });
  }
});

// ============================================
// Invariante 2: valores_posibles ⊂ variables_criticas
// ============================================

Deno.test("makePerfil - valor_posible con clave desconocida rechazado", () => {
  const r = makePerfil({
    variables_criticas: ["categoria"],
    valores_posibles: { zona: ["Norte", "Sur"] },
  });
  assertEquals(r.ok, false);
  if (!r.ok && r.error.kind === "valor_posible_no_critica") {
    assertEquals(r.error.clave, "zona");
  }
});

Deno.test("makePerfil - valor_posible resuelve por normalización", () => {
  // La clave "Área Funcional" del JSON debe casar con la crítica "area_funcional".
  const r = makePerfil({
    variables_criticas: ["area_funcional"],
    valores_posibles: { "Área Funcional": ["A1", "A2"] },
  });
  assertEquals(r.ok, true);
});

Deno.test("makePerfil - valor_posible con valor vacío rechazado", () => {
  const r = makePerfil({
    variables_criticas: ["categoria"],
    valores_posibles: { categoria: ["Camarero", ""] },
  });
  assertEquals(r.ok, false);
  if (!r.ok && r.error.kind === "valor_posible_invalid_value") {
    assertEquals(r.error.clave, "categoria");
    assertEquals(r.error.index, 1);
  }
});

// ============================================
// Invariante 3: categorias con nombres únicos
// ============================================

Deno.test("makePerfil - categorías con nombre duplicado rechazadas", () => {
  const r = makePerfil({
    variables_criticas: ["categoria"],
    categorias_profesionales: [
      { nombre: "Camarero" },
      { nombre: "camarero" },
    ],
  });
  assertEquals(r.ok, false);
  if (!r.ok && r.error.kind === "categoria_duplicated") {
    assertEquals(r.error.nombre, "camarero");
  }
});

Deno.test("makePerfil - categoría inválida propaga índice y causa", () => {
  const r = makePerfil({
    variables_criticas: ["categoria"],
    categorias_profesionales: [{ nombre: "Camarero" }, { nombre: "" }],
  });
  assertEquals(r.ok, false);
  if (!r.ok && r.error.kind === "categoria_invalid") {
    assertEquals(r.error.index, 1);
    assertEquals(r.error.cause, { kind: "nombre_empty" });
  }
});

// ============================================
// Tipos raíz
// ============================================

Deno.test("makePerfil - input no-objeto rechazado", () => {
  assertEquals(makePerfil(null), {
    ok: false,
    error: { kind: "invalid_type" },
  });
  assertEquals(makePerfil([]), {
    ok: false,
    error: { kind: "invalid_type" },
  });
});
