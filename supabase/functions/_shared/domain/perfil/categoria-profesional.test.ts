// supabase/functions/_shared/domain/perfil/categoria-profesional.test.ts

import { assertEquals } from "@std/assert";
import { makeCategoriaProfesional } from "./categoria-profesional.ts";

Deno.test("makeCategoriaProfesional - JSON mínimo válido (solo nombre)", () => {
  const r = makeCategoriaProfesional({ nombre: "Camarero" });
  assertEquals(r.ok, true);
  if (r.ok) {
    assertEquals(r.value.nombre, "Camarero");
    assertEquals(r.value.sinonimos, []);
  }
});

Deno.test("makeCategoriaProfesional - con sinónimos y salarios", () => {
  const r = makeCategoriaProfesional({
    nombre: "Cocinero",
    sinonimos: ["Chef", "Jefe de cocina"],
    grupo: "II",
    nivel: "3",
    area_funcional: "Cocina",
    salarios: { A: 1500, B: 1300 },
    salario_base_anual: 21000,
  });
  assertEquals(r.ok, true);
  if (r.ok) {
    assertEquals(r.value.nombre, "Cocinero");
    assertEquals(r.value.sinonimos, ["Chef", "Jefe de cocina"]);
    assertEquals(r.value.grupo, "II");
    assertEquals(r.value.areaFuncional, "Cocina");
    assertEquals(r.value.salarios, { A: 1500, B: 1300 });
    assertEquals(r.value.salarioBaseAnual, 21000);
  }
});

Deno.test("makeCategoriaProfesional - nombre vacío rechazado", () => {
  assertEquals(makeCategoriaProfesional({ nombre: "  " }), {
    ok: false,
    error: { kind: "nombre_empty" },
  });
});

Deno.test("makeCategoriaProfesional - nombre ausente rechazado", () => {
  assertEquals(makeCategoriaProfesional({}), {
    ok: false,
    error: { kind: "nombre_empty" },
  });
});

Deno.test("makeCategoriaProfesional - sinónimo vacío rechazado", () => {
  assertEquals(
    makeCategoriaProfesional({ nombre: "Camarero", sinonimos: ["Chef", ""] }),
    { ok: false, error: { kind: "sinonimo_empty", index: 1 } },
  );
});

Deno.test("makeCategoriaProfesional - salarios con NaN rechazados", () => {
  assertEquals(
    makeCategoriaProfesional({
      nombre: "Camarero",
      salarios: { A: Number.NaN },
    }),
    { ok: false, error: { kind: "invalid_salarios_type" } },
  );
});

Deno.test("makeCategoriaProfesional - input no-objeto rechazado", () => {
  assertEquals(makeCategoriaProfesional("Camarero"), {
    ok: false,
    error: { kind: "invalid_type" },
  });
  assertEquals(makeCategoriaProfesional(null), {
    ok: false,
    error: { kind: "invalid_type" },
  });
});
