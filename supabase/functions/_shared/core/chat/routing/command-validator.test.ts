// supabase/functions/_shared/core/chat/routing/command-validator.test.ts

import { assertEquals } from "@std/assert";
import type { ChatRequest } from "../types.ts";
import { validateChatCommand } from "./command-validator.ts";

const CONVENIO_ID = "3f9e2a1c-6b7d-4c8e-9a0b-1c2d3e4f5a6b";
const USER_ID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";

function baseRequest(): ChatRequest {
  return {
    convenio_id: CONVENIO_ID,
    pregunta: "cuanto cobra un camarero",
  };
}

Deno.test("validateChatCommand - request válido devuelve null (passthrough)", () => {
  assertEquals(validateChatCommand(baseRequest(), USER_ID), null);
});

Deno.test("validateChatCommand - horas_semanales negativas devuelve invalid_data tipado", () => {
  const result = validateChatCommand(
    {
      ...baseRequest(),
      variables: { horasSemanales: -5 as unknown as string },
    },
    USER_ID,
  );
  assertEquals(result?.type, "invalid_data");
  assertEquals(result?.invalidVariables[0].name, "horasSemanales");
  assertEquals(
    result?.invalidVariables[0].reason,
    "horasSemanales_below_minimum",
  );
});

Deno.test("validateChatCommand - convenio_id no UUID devuelve invalid_data", () => {
  const result = validateChatCommand(
    { ...baseRequest(), convenio_id: "not-a-uuid" },
    USER_ID,
  );
  assertEquals(result?.type, "invalid_data");
  assertEquals(
    result?.message,
    "convenio_id invalido: not_uuid",
  );
});

Deno.test("validateChatCommand - jornada completa con 30h reporta jornada_invalida", () => {
  const result = validateChatCommand(
    {
      ...baseRequest(),
      variables: {
        horasSemanales: 30 as unknown as string,
        jornada: "completa",
      },
    },
    USER_ID,
  );
  assertEquals(result?.type, "invalid_data");
  assertEquals(result?.invalidVariables[0].name, "jornada");
  assertEquals(
    result?.invalidVariables[0].reason,
    "completa_con_horas_bajas",
  );
});

Deno.test("validateChatCommand - horasNocturnas exceden base anual", () => {
  const result = validateChatCommand(
    {
      ...baseRequest(),
      variables: {
        horasSemanales: 8 as unknown as string,
        horasNocturnas: 500 as unknown as string,
      },
    },
    USER_ID,
  );
  assertEquals(result?.type, "invalid_data");
  assertEquals(
    result?.invalidVariables[0].reason,
    "horas_nocturnas_exceden_base_anual",
  );
});
