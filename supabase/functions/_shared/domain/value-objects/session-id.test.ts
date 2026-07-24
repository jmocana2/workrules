// supabase/functions/_shared/domain/value-objects/session-id.test.ts

import { assertEquals } from "@std/assert";
import { makeSessionId, SessionId } from "./session-id.ts";

const VALID_V4 = "0d9b8a7c-6e5f-4d3c-b2a1-908f7e6d5c4b";
const VALID_V4_UPPER = "0D9B8A7C-6E5F-4D3C-B2A1-908F7E6D5C4B";
const VALID_V1 = "550e8400-e29b-11d4-a716-446655440000";

Deno.test("makeSessionId - UUID v4 válido", () => {
  assertEquals(makeSessionId(VALID_V4), { ok: true, value: VALID_V4 as SessionId });
});

Deno.test("makeSessionId - UUID v4 en mayúsculas se normaliza", () => {
  assertEquals(makeSessionId(VALID_V4_UPPER), { ok: true, value: VALID_V4 as SessionId });
});

Deno.test("makeSessionId - string vacío devuelve empty", () => {
  assertEquals(makeSessionId(""), { ok: false, error: { kind: "empty" } });
});

Deno.test("makeSessionId - UUID malformado (falta un char)", () => {
  assertEquals(makeSessionId("0d9b8a7c-6e5f-4d3c-b2a1-908f7e6d5c4"), {
    ok: false,
    error: { kind: "not_uuid" },
  });
});

Deno.test("makeSessionId - UUID v1 se rechaza", () => {
  assertEquals(makeSessionId(VALID_V1), {
    ok: false,
    error: { kind: "not_uuid" },
  });
});
