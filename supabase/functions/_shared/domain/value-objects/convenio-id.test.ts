// supabase/functions/_shared/domain/value-objects/convenio-id.test.ts

import { assertEquals } from "@std/assert";
import { ConvenioId, makeConvenioId } from "./convenio-id.ts";

const VALID_V4 = "3f9e2a1c-6b7d-4c8e-9a0b-1c2d3e4f5a6b";
const VALID_V4_UPPER = "3F9E2A1C-6B7D-4C8E-9A0B-1C2D3E4F5A6B";
// UUID v1 (time-based): el 13º char es "1"
const VALID_V1 = "550e8400-e29b-11d4-a716-446655440000";

Deno.test("makeConvenioId - UUID v4 válido en minúsculas", () => {
  const r = makeConvenioId(VALID_V4);
  assertEquals(r, { ok: true, value: VALID_V4 as ConvenioId });
});

Deno.test("makeConvenioId - UUID v4 en mayúsculas se normaliza a minúsculas", () => {
  const r = makeConvenioId(VALID_V4_UPPER);
  assertEquals(r, { ok: true, value: VALID_V4 as ConvenioId });
});

Deno.test("makeConvenioId - string vacío devuelve empty", () => {
  assertEquals(makeConvenioId(""), { ok: false, error: { kind: "empty" } });
});

Deno.test("makeConvenioId - solo whitespace devuelve empty", () => {
  assertEquals(makeConvenioId("   "), { ok: false, error: { kind: "empty" } });
});

Deno.test("makeConvenioId - string arbitrario devuelve not_uuid", () => {
  assertEquals(makeConvenioId("no-soy-un-uuid"), {
    ok: false,
    error: { kind: "not_uuid" },
  });
});

Deno.test("makeConvenioId - UUID v1 se rechaza (solo v4)", () => {
  assertEquals(makeConvenioId(VALID_V1), {
    ok: false,
    error: { kind: "not_uuid" },
  });
});

Deno.test("makeConvenioId - trim de whitespace alrededor de un UUID válido", () => {
  const r = makeConvenioId(`  ${VALID_V4}  `);
  assertEquals(r, { ok: true, value: VALID_V4 as ConvenioId });
});
