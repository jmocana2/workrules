// supabase/functions/_shared/domain/chat-command/input-mapper.test.ts

import { assertEquals } from "@std/assert";
import { makePerfil, Perfil } from "../perfil/perfil.ts";
import { ChatRequestRaw, toChatCommand } from "./input-mapper.ts";

const CONVENIO_ID = "3f9e2a1c-6b7d-4c8e-9a0b-1c2d3e4f5a6b";
const USER_ID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
const SESSION_ID = "0d9b8a7c-6e5f-4d3c-b2a1-908f7e6d5c4b";

function perfilFixture(): Perfil {
  const r = makePerfil({
    variables_criticas: ["categoria", "jornada"],
    categorias_profesionales: [{ nombre: "Camarero" }],
  });
  if (!r.ok) throw new Error("fixture perfil inválido");
  return r.value;
}

const PERFIL = perfilFixture();

function baseRequest(): ChatRequestRaw {
  return {
    convenio_id: CONVENIO_ID,
    user_id: USER_ID,
    pregunta: "cuanto cobra un camarero",
  };
}

// ============================================
// Casos válidos
// ============================================

Deno.test("toChatCommand - request mínimo válido → salary intent", () => {
  const r = toChatCommand(baseRequest(), PERFIL);
  assertEquals(r.ok, true);
  if (r.ok) {
    assertEquals(r.value.convenioId, CONVENIO_ID);
    assertEquals(r.value.userId, USER_ID);
    assertEquals(r.value.sessionId, undefined);
    assertEquals(r.value.intent.kind, "salary_calculation");
    assertEquals(r.value.variables, undefined);
    assertEquals(r.value.stream, false);
  }
});

Deno.test("toChatCommand - request con session_id válido", () => {
  const r = toChatCommand(
    { ...baseRequest(), session_id: SESSION_ID },
    PERFIL,
  );
  assertEquals(r.ok, true);
  if (r.ok) assertEquals(r.value.sessionId, SESSION_ID);
});

Deno.test("toChatCommand - variables completas construyen Jornada", () => {
  const r = toChatCommand(
    {
      ...baseRequest(),
      variables: {
        categoria: "Camarero",
        horasSemanales: 40,
        jornada: "completa",
        horasExtra: 20,
        horasNocturnas: 8,
        antiguedadAnos: 2.5,
      },
    },
    PERFIL,
  );
  assertEquals(r.ok, true);
  if (r.ok && r.value.variables) {
    assertEquals(r.value.variables.categoria, "Camarero");
    assertEquals(r.value.variables.jornada?.tipo, "completa");
    assertEquals(r.value.variables.jornada?.horas, 40);
    assertEquals(r.value.variables.horasExtraAnuales, 20);
    assertEquals(r.value.variables.horasNocturnas, 8);
    assertEquals(r.value.variables.antiguedadAnos, 2.5);
  }
});

Deno.test("toChatCommand - variables como strings numéricas se parsean", () => {
  const r = toChatCommand(
    {
      ...baseRequest(),
      variables: { horasSemanales: "37,5" as unknown as number },
    },
    PERFIL,
  );
  assertEquals(r.ok, true);
  if (r.ok) assertEquals(r.value.variables?.jornada, undefined);
});

Deno.test("toChatCommand - mode='salary' fuerza salary_calculation", () => {
  const r = toChatCommand(
    { ...baseRequest(), pregunta: "hola", mode: "salary" },
    PERFIL,
  );
  assertEquals(r.ok, true);
  if (r.ok) assertEquals(r.value.intent.kind, "salary_calculation");
});

// ============================================
// Errores por campo
// ============================================

Deno.test("toChatCommand - pregunta vacía", () => {
  const r = toChatCommand({ ...baseRequest(), pregunta: "  " }, PERFIL);
  assertEquals(r, { ok: false, error: { kind: "pregunta_empty" } });
});

Deno.test("toChatCommand - convenio_id malformado → not_uuid", () => {
  const r = toChatCommand(
    { ...baseRequest(), convenio_id: "not-a-uuid" },
    PERFIL,
  );
  assertEquals(r.ok, false);
  if (!r.ok && r.error.kind === "convenio_id") {
    assertEquals(r.error.cause, { kind: "not_uuid" });
  }
});

Deno.test("toChatCommand - user_id vacío → empty", () => {
  const r = toChatCommand({ ...baseRequest(), user_id: "" }, PERFIL);
  assertEquals(r.ok, false);
  if (!r.ok && r.error.kind === "user_id") {
    assertEquals(r.error.cause, { kind: "empty" });
  }
});

Deno.test("toChatCommand - session_id malformado", () => {
  const r = toChatCommand(
    { ...baseRequest(), session_id: "abc" },
    PERFIL,
  );
  assertEquals(r.ok, false);
  if (!r.ok && r.error.kind === "session_id") {
    assertEquals(r.error.cause, { kind: "not_uuid" });
  }
});

Deno.test("toChatCommand - horas_semanales negativas", () => {
  const r = toChatCommand(
    { ...baseRequest(), variables: { horasSemanales: -5 } },
    PERFIL,
  );
  assertEquals(r.ok, false);
  if (!r.ok && r.error.kind === "horas_semanales") {
    assertEquals(r.error.field, "horasSemanales");
    assertEquals(r.error.cause.kind, "below_minimum");
  }
});

Deno.test("toChatCommand - horas_semanales fracción no admitida", () => {
  const r = toChatCommand(
    { ...baseRequest(), variables: { horasSemanales: 40.5 } },
    PERFIL,
  );
  assertEquals(r.ok, false);
  if (!r.ok && r.error.kind === "horas_semanales") {
    assertEquals(r.error.cause.kind, "above_legal_max");
  }
});

Deno.test("toChatCommand - jornada tipo desconocido", () => {
  const r = toChatCommand(
    { ...baseRequest(), variables: { jornada: "flexible" } },
    PERFIL,
  );
  assertEquals(r.ok, false);
  if (!r.ok && r.error.kind === "jornada_tipo_desconocido") {
    assertEquals(r.error.raw, "flexible");
  }
});

Deno.test("toChatCommand - jornada completa con 30h propaga JornadaError", () => {
  const r = toChatCommand(
    {
      ...baseRequest(),
      variables: { horasSemanales: 30, jornada: "completa" },
    },
    PERFIL,
  );
  assertEquals(r.ok, false);
  if (!r.ok && r.error.kind === "jornada_invalida") {
    assertEquals(r.error.cause.kind, "completa_con_horas_bajas");
  }
});

// ============================================
// Invariante cross-field
// ============================================

Deno.test("toChatCommand - horasNocturnas > horasSemanales * 52 rechazado", () => {
  const r = toChatCommand(
    {
      ...baseRequest(),
      variables: { horasSemanales: 8, horasNocturnas: 500 },
    },
    PERFIL,
  );
  assertEquals(r.ok, false);
  if (!r.ok && r.error.kind === "horas_nocturnas_exceden_base_anual") {
    assertEquals(r.error.tope, 8 * 52);
    assertEquals(r.error.horasNocturnas, 500);
  }
});

Deno.test("toChatCommand - horasNocturnas exactamente en el tope aceptadas", () => {
  const r = toChatCommand(
    {
      ...baseRequest(),
      variables: { horasSemanales: 8, horasNocturnas: 8 * 52 },
    },
    PERFIL,
  );
  assertEquals(r.ok, true);
});

// ============================================
// Extras: variables críticas del perfil ajenas al VO
// ============================================

Deno.test("toChatCommand - preserva variables ajenas al VO como extras (fix bucle DataRequestCard)", () => {
  const r = toChatCommand(
    {
      ...baseRequest(),
      variables: {
        categoria: "Gobernanta",
        tipo_establecimiento: "4 estrellas",
        zona: "centro",
      } as unknown as Record<string, string | number | undefined>,
    },
    PERFIL,
  );
  assertEquals(r.ok, true);
  if (r.ok) {
    assertEquals(r.value.variables?.categoria, "Gobernanta");
    assertEquals(r.value.variables?.extras, {
      tipo_establecimiento: "4 estrellas",
      zona: "centro",
    });
  }
});

Deno.test("toChatCommand - sin extras devuelve extras undefined", () => {
  const r = toChatCommand(
    {
      ...baseRequest(),
      variables: { categoria: "Camarero" },
    },
    PERFIL,
  );
  assertEquals(r.ok, true);
  if (r.ok) assertEquals(r.value.variables?.extras, undefined);
});
