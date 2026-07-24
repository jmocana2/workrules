// supabase/functions/_shared/domain/value-objects/user-id.test.ts

import { assertEquals } from "@std/assert";
import { makeUserId, UserId } from "./user-id.ts";

const VALID_V4 = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
const VALID_V4_UPPER = "A1B2C3D4-E5F6-4A7B-8C9D-0E1F2A3B4C5D";
const VALID_V1 = "550e8400-e29b-11d4-a716-446655440000";

Deno.test("makeUserId - UUID v4 válido", () => {
  assertEquals(makeUserId(VALID_V4), { ok: true, value: VALID_V4 as UserId });
});

Deno.test("makeUserId - UUID v4 en mayúsculas se normaliza", () => {
  assertEquals(makeUserId(VALID_V4_UPPER), { ok: true, value: VALID_V4 as UserId });
});

Deno.test("makeUserId - string vacío devuelve empty", () => {
  assertEquals(makeUserId(""), { ok: false, error: { kind: "empty" } });
});

Deno.test("makeUserId - string arbitrario devuelve not_uuid", () => {
  assertEquals(makeUserId("user-123"), {
    ok: false,
    error: { kind: "not_uuid" },
  });
});

Deno.test("makeUserId - UUID v1 se rechaza", () => {
  assertEquals(makeUserId(VALID_V1), {
    ok: false,
    error: { kind: "not_uuid" },
  });
});
