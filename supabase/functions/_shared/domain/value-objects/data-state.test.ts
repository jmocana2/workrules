// supabase/functions/_shared/domain/value-objects/data-state.test.ts

import { assertEquals } from "@std/assert";
import { fromChecks } from "./data-state.ts";

Deno.test("fromChecks - todo a cero → complete", () => {
  assertEquals(
    fromChecks({ invalidCount: 0, conflictingCount: 0, missingCount: 0 }).kind,
    "complete",
  );
});

Deno.test("fromChecks - solo missing → incomplete", () => {
  assertEquals(
    fromChecks({ invalidCount: 0, conflictingCount: 0, missingCount: 3 }).kind,
    "incomplete",
  );
});

Deno.test("fromChecks - solo conflicting → conflicting", () => {
  assertEquals(
    fromChecks({ invalidCount: 0, conflictingCount: 1, missingCount: 0 }).kind,
    "conflicting",
  );
});

Deno.test("fromChecks - solo invalid → invalid", () => {
  assertEquals(
    fromChecks({ invalidCount: 2, conflictingCount: 0, missingCount: 0 }).kind,
    "invalid",
  );
});

// ============================================
// Precedencia: invalid > conflicting > incomplete > complete
// ============================================

Deno.test("precedencia - invalid gana sobre conflicting", () => {
  assertEquals(
    fromChecks({ invalidCount: 1, conflictingCount: 1, missingCount: 0 }).kind,
    "invalid",
  );
});

Deno.test("precedencia - invalid gana sobre incomplete", () => {
  assertEquals(
    fromChecks({ invalidCount: 1, conflictingCount: 0, missingCount: 5 }).kind,
    "invalid",
  );
});

Deno.test("precedencia - invalid gana sobre conflicting + incomplete", () => {
  assertEquals(
    fromChecks({ invalidCount: 1, conflictingCount: 1, missingCount: 1 }).kind,
    "invalid",
  );
});

Deno.test("precedencia - conflicting gana sobre incomplete", () => {
  assertEquals(
    fromChecks({ invalidCount: 0, conflictingCount: 1, missingCount: 2 }).kind,
    "conflicting",
  );
});
