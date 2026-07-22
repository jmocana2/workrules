/**
 * Tests para calculate-salary.ts
 *
 * @module calculate-salary.test
 */

import { assertEquals, assertExists } from "@std/assert";
import {
  calculateSalary,
  type CalculateSalaryDeps,
} from "./index.ts";
import type { CalculateSalaryInput } from "../types.ts";
import { toChatCommand } from "../../../domain/chat-command/input-mapper.ts";

const VALID_CONVENIO_ID = "11111111-1111-4111-8111-111111111111";
const VALID_USER_ID = "22222222-2222-4222-8222-222222222222";
const VALID_SESSION_ID = "33333333-3333-4333-8333-333333333333";

const DEFAULT_PERFIL = {
  variables_criticas: ["categoria", "jornada"],
  categorias_profesionales: [
    { nombre: "Gobernanta", salario_base_anual: 22000 },
    { nombre: "Camarera de pisos", salario_base_anual: 19850 },
    { nombre: "Ayudante de cocina", salario_base_anual: 19850 },
  ],
  jornada: { horas_anuales: 1826 },
  tablas_salariales: { ano_referencia: "2024" },
};

// ============================================
// MOCK HELPERS
// ============================================

function createMockDeps(
  overrides: Partial<CalculateSalaryDeps> = {},
): CalculateSalaryDeps {
  return {
    checkUserQuota: async () => ({
      hasQuota: true,
      used: 5,
      limit: 15,
      tier: "free" as const,
    }),
    embedQuestion: async () => Array(1536).fill(0.1),
    searchSemanticCache: async () => null,
    getConvenioById: async () => ({
      id: VALID_CONVENIO_ID,
      nombre: "Hosteleria Valencia",
      codigo_regcon: "RC-12345",
      ambito: "provincial",
      fecha_vigencia: "2024-01-01",
      estado: "vigente",
    }),
    searchChunksByConvenio: async () => [
      {
        chunk_id: "chunk-1",
        convenio_id: VALID_CONVENIO_ID,
        contenido: "Salario base anual: 19.850 euros",
        similarity: 0.85,
        metadata: { articulo: "31", seccion: "Retribuciones" },
      },
    ],
    getPerfilByConvenio: async () => ({
      variables_criticas: ["categoria", "jornada"],
      categorias_profesionales: [
        { nombre: "Gobernanta", salario_base_anual: 22000 },
        { nombre: "Camarera de pisos", salario_base_anual: 19850 },
        { nombre: "Ayudante de cocina", salario_base_anual: 19850 },
      ],
      jornada: { horas_anuales: 1826 },
      tablas_salariales: { ano_referencia: "2024" },
    }),
    createChatResponse: async () =>
      "Calculo del salario...\n\n**Paso 1:** Salario base\n**Total:** 1.654,17 euros",
    streamChatResponse: async () =>
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("data: test\n\n"));
          controller.close();
        },
      }),
    saveToSemanticCache: async () => {},
    saveChatMessage: async () => {},
    incrementQueryCount: async () => true,
    ...overrides,
  };
}

/**
 * Overrides ergonómicos para construir un `CalculateSalaryInput` desde
 * campos crudos (como los usaba el input pre-refactor 007 fase 8b). Todo
 * pasa por `toChatCommand` para producir el `ChatCommand` que espera el use
 * case.
 */
interface RawInputOverrides {
  convenioId?: string;
  userId?: string;
  sessionId?: string;
  pregunta?: string;
  stream?: boolean;
  variablesConocidas?: Record<string, string | number>;
  messages?: { role: "user" | "assistant"; content: string }[];
  perfil?: Record<string, unknown> | null;
}

function createInput(
  overrides: RawInputOverrides = {},
): CalculateSalaryInput {
  const cmdResult = toChatCommand({
    convenio_id: overrides.convenioId ?? VALID_CONVENIO_ID,
    user_id: overrides.userId ?? VALID_USER_ID,
    pregunta: overrides.pregunta ??
      "Calcula el salario de una gobernanta a jornada completa",
    session_id: overrides.sessionId,
    variables: overrides.variablesConocidas as
      | Record<string, string | number | undefined>
      | undefined,
    messages: overrides.messages,
    stream: overrides.stream,
  });
  if (!cmdResult.ok) {
    throw new Error(
      `Test fixture invalid: ${JSON.stringify(cmdResult.error)}`,
    );
  }
  return {
    command: cmdResult.value,
    perfil: overrides.perfil !== undefined ? overrides.perfil : DEFAULT_PERFIL,
  };
}

// ============================================
// FLUJO EXITOSO
// ============================================

Deno.test("calculateSalary - calculo exitoso con datos completos", async () => {
  const deps = createMockDeps();
  const input = createInput();

  const result = await calculateSalary(input, deps);

  assertEquals(result.type, "salary_calculated");
  if (result.type === "salary_calculated") {
    assertExists(result.response);
    assertExists(result.metadata);
    assertEquals(result.metadata.cacheHit, false);
    assertEquals(result.metadata.model, "claude-sonnet-4-5");
    assertExists(result.metadata.variablesUsadas);
    assertEquals(result.metadata.variablesUsadas.categoria, "Gobernanta");
    assertEquals(result.metadata.variablesUsadas.jornada, "completa");
  }
});

Deno.test("calculateSalary - incluye citations de chunks", async () => {
  const deps = createMockDeps();
  const input = createInput();

  const result = await calculateSalary(input, deps);

  assertEquals(result.type, "salary_calculated");
  if (result.type === "salary_calculated") {
    assertEquals(result.citations.length, 1);
    assertEquals(result.citations[0].articulo, "31");
    assertEquals(result.citations[0].seccion, "Retribuciones");
  }
});

Deno.test("calculateSalary - omite articulo en citations de tabla salarial", async () => {
  const deps = createMockDeps({
    searchChunksByConvenio: async () => [
      {
        chunk_id: "chunk-tabla",
        convenio_id: VALID_CONVENIO_ID,
        contenido: "Tabla salarial anual 2024",
        similarity: 0.9,
        metadata: {
          articulo: "Art. 1",
          seccion: "Tablas salariales",
          tipo: "tabla_salarial",
        },
      },
    ],
  });
  const input = createInput();

  const result = await calculateSalary(input, deps);

  assertEquals(result.type, "salary_calculated");
  if (result.type === "salary_calculated") {
    assertEquals(result.citations.length, 1);
    assertEquals(result.citations[0].articulo, undefined);
    assertEquals(result.citations[0].seccion, "Tablas salariales");
  }
});

Deno.test("calculateSalary - extrae variables del mensaje", async () => {
  const deps = createMockDeps();
  const input = createInput({
    // Incluimos jornada completa porque el perfil tiene 'jornada' como variable critica
    pregunta:
      "Calcula el salario de un ayudante de cocina a jornada completa en hotel 4 estrellas con 10 horas extra",
  });

  const result = await calculateSalary(input, deps);

  assertEquals(result.type, "salary_calculated");
  if (result.type === "salary_calculated") {
    assertEquals(
      result.metadata.variablesUsadas.categoria,
      "Ayudante de cocina",
    );
    assertEquals(
      result.metadata.variablesUsadas.nivelEstablecimiento,
      "4 estrellas",
    );
    assertEquals(result.metadata.variablesUsadas.horasExtra, 10);
    assertEquals(result.metadata.variablesUsadas.jornada, "completa");
  }
});

Deno.test("calculateSalary - merge con variables conocidas", async () => {
  const deps = createMockDeps();
  const input = createInput({
    pregunta: "Ahora calcula con 5 horas nocturnas",
    variablesConocidas: {
      categoria: "Gobernanta",
      jornada: "completa",
      horasSemanales: 40,
    },
  });

  const result = await calculateSalary(input, deps);

  assertEquals(result.type, "salary_calculated");
  if (result.type === "salary_calculated") {
    // Conserva variables conocidas
    assertEquals(result.metadata.variablesUsadas.categoria, "Gobernanta");
    assertEquals(result.metadata.variablesUsadas.jornada, "completa");
    // Anade nuevas
    assertEquals(result.metadata.variablesUsadas.horasNocturnas, 5);
  }
});

// ============================================
// CACHE HIT
// ============================================

Deno.test("calculateSalary - cache hit retorna respuesta cacheada", async () => {
  const deps = createMockDeps({
    searchSemanticCache: async () => ({
      cache_id: "cache-123",
      response: "Respuesta cacheada",
      similarity: 0.98,
      hit_count: 5,
      citations: [],
    }),
  });
  const input = createInput();

  const result = await calculateSalary(input, deps);

  assertEquals(result.type, "cache_hit");
  if (result.type === "cache_hit") {
    assertEquals(result.response, "Respuesta cacheada");
    assertEquals(result.metadata.cacheHit, true);
    assertEquals(result.metadata.model, "cache");
  }
});

// ============================================
// DATOS INCOMPLETOS
// ============================================

Deno.test("calculateSalary - detecta datos incompletos", async () => {
  const deps = createMockDeps();
  // Pregunta sin categoria
  const input = createInput({
    pregunta: "Calcula el salario a jornada completa",
  });

  const result = await calculateSalary(input, deps);

  assertEquals(result.type, "incomplete_data");
  if (result.type === "incomplete_data") {
    assertEquals(result.missingVariables.includes("categoria"), true);
    assertExists(result.suggestions);
    // Debe sugerir categorias del perfil
    assertEquals(result.suggestions["categoria"]?.length, 3);
  }
});

Deno.test("calculateSalary - mensaje incompleto incluye nombre convenio", async () => {
  const deps = createMockDeps();
  const input = createInput({
    pregunta: "Calcula el salario",
  });

  const result = await calculateSalary(input, deps);

  assertEquals(result.type, "incomplete_data");
  if (result.type === "incomplete_data") {
    assertEquals(result.message.includes("Hosteleria Valencia"), true);
  }
});

// ============================================
// DATOS INVALIDOS
// ============================================

Deno.test("calculateSalary - detecta horas extra > 80", async () => {
  const deps = createMockDeps();
  const input = createInput({
    pregunta: "Calcula salario de gobernanta con 100 horas extra",
  });

  const result = await calculateSalary(input, deps);

  assertEquals(result.type, "invalid_data");
  if (result.type === "invalid_data") {
    assertEquals(result.invalidVariables.length, 1);
    assertEquals(result.invalidVariables[0].name, "horasExtra");
    assertEquals(result.invalidVariables[0].value, 100);
  }
});

Deno.test("calculateSalary - detecta jornada > 40h", async () => {
  const deps = createMockDeps();
  const input = createInput({
    pregunta: "Calcula salario de gobernanta con 50 horas semanales",
  });

  const result = await calculateSalary(input, deps);

  assertEquals(result.type, "invalid_data");
  if (result.type === "invalid_data") {
    assertEquals(result.invalidVariables[0].name, "horasSemanales");
  }
});

// ============================================
// DATOS CONFLICTIVOS
// ============================================

Deno.test("calculateSalary - conflicto jornada/horas detectado en construcción del ChatCommand", () => {
  // Refactor 007 fase 8b: la coherencia jornada+horas es ahora invariante del
  // VO `Jornada`. El conflicto `completa + 20h` ya no llega al use case: lo
  // rechaza `toChatCommand`, y el router responde `invalid_data` antes de
  // cualquier fetch. Verificamos ese contrato aquí.
  let threw = false;
  try {
    createInput({
      pregunta: "Calcula el salario",
      variablesConocidas: {
        categoria: "Gobernanta",
        jornada: "completa",
        horasSemanales: 20,
      },
    });
  } catch (e) {
    threw = true;
    assertEquals(
      String(e).includes("completa_con_horas_bajas"),
      true,
    );
  }
  assertEquals(threw, true);
});

// ============================================
// CUOTA EXCEDIDA
// ============================================

Deno.test("calculateSalary - cuota excedida", async () => {
  const deps = createMockDeps({
    checkUserQuota: async () => ({
      hasQuota: false,
      used: 15,
      limit: 15,
      tier: "free" as const,
    }),
  });
  const input = createInput();

  const result = await calculateSalary(input, deps);

  assertEquals(result.type, "quota_exceeded");
  if (result.type === "quota_exceeded") {
    assertEquals(result.message.includes("limite"), true);
  }
});

// ============================================
// CONVENIO NO ENCONTRADO
// ============================================

Deno.test("calculateSalary - convenio no encontrado", async () => {
  const deps = createMockDeps({
    getConvenioById: async () => null,
  });
  const input = createInput();

  const result = await calculateSalary(input, deps);

  assertEquals(result.type, "not_found");
  if (result.type === "not_found") {
    assertEquals(result.message.includes("no encontrado"), true);
  }
});

// ============================================
// STREAMING
// ============================================

Deno.test("calculateSalary - modo streaming retorna stream", async () => {
  const deps = createMockDeps();
  const input = createInput({ stream: true });

  const result = await calculateSalary(input, deps);

  assertEquals(result.type, "stream");
  if (result.type === "stream") {
    assertExists(result.stream);
    assertExists(result.cleanup);
    // Verificar que el stream es legible
    const reader = result.stream.getReader();
    const { value } = await reader.read();
    assertExists(value);
  }
});

Deno.test("calculateSalary - streaming con datos incompletos NO retorna stream", async () => {
  const deps = createMockDeps();
  const input = createInput({
    pregunta: "Calcula el salario", // Sin categoria
    stream: true,
  });

  const result = await calculateSalary(input, deps);

  // Debe retornar incomplete_data, no stream
  assertEquals(result.type, "incomplete_data");
});

// ============================================
// ERRORES
// ============================================

Deno.test("calculateSalary - error de embedding", async () => {
  const { EmbeddingError } = await import("../../../lib/openai.ts");
  const deps = createMockDeps({
    embedQuestion: async () => {
      throw new EmbeddingError("API error", "API_ERROR", false);
    },
  });
  const input = createInput();

  const result = await calculateSalary(input, deps);

  assertEquals(result.type, "error");
  if (result.type === "error") {
    assertEquals(result.code, "EMBEDDING_API_ERROR");
  }
});

Deno.test("calculateSalary - error de Anthropic rate limit", async () => {
  const { AnthropicError } = await import("../../../lib/anthropic.ts");
  const deps = createMockDeps({
    createChatResponse: async () => {
      throw new AnthropicError("Rate limited", "RATE_LIMIT", true);
    },
  });
  const input = createInput();

  const result = await calculateSalary(input, deps);

  assertEquals(result.type, "error");
  if (result.type === "error") {
    assertEquals(result.code, "ANTHROPIC_RATE_LIMIT");
    assertEquals(result.message.includes("sobrecargado"), true);
  }
});

Deno.test("calculateSalary - error de Supabase", async () => {
  const { RepositoryError } = await import("../../../lib/supabase.ts");
  const deps = createMockDeps({
    searchChunksByConvenio: async () => {
      throw new RepositoryError("DB error", "DB_ERROR");
    },
  });
  const input = createInput();

  const result = await calculateSalary(input, deps);

  assertEquals(result.type, "error");
  if (result.type === "error") {
    assertEquals(result.code, "DB_DB_ERROR");
  }
});

Deno.test("calculateSalary - error desconocido", async () => {
  const deps = createMockDeps({
    createChatResponse: async () => {
      throw new Error("Unknown error");
    },
  });
  const input = createInput();

  const result = await calculateSalary(input, deps);

  assertEquals(result.type, "error");
  if (result.type === "error") {
    assertEquals(result.code, "INTERNAL_ERROR");
  }
});

// ============================================
// SIN PERFIL
// ============================================

Deno.test("calculateSalary - sin perfil no valida variables faltantes", async () => {
  const deps = createMockDeps();
  const input = createInput({
    pregunta: "Calcula el salario", // Sin categoria pero sin perfil
    perfil: null,
  });

  const result = await calculateSalary(input, deps);

  // Sin perfil, no hay variables criticas, asi que es "completo"
  assertEquals(result.type, "salary_calculated");
});

// ============================================
// LATENCIA
// ============================================

Deno.test("calculateSalary - incluye latencia en metadata", async () => {
  const deps = createMockDeps();
  const input = createInput();

  const result = await calculateSalary(input, deps);

  assertEquals(result.type, "salary_calculated");
  if (result.type === "salary_calculated") {
    assertExists(result.metadata.latencyMs);
    assertEquals(result.metadata.latencyMs >= 0, true);
  }
});

// ============================================
// REGRESION: bucle DataRequestCard
// ============================================

Deno.test("calculateSalary - variables ajenas al VO (tipo_establecimiento) satisfacen variables_criticas", async () => {
  // Regresión fase 8b: si el chip del DataRequestCard envía una variable crítica
  // del perfil que no está modelada como VO (ej. `tipo_establecimiento`), debía
  // preservarse a través del ChatCommand.extras y normalizarse a clave canónica
  // para que `checkMissingVariables` la case. Si no, cada respuesta del usuario
  // vuelve a devolver `incomplete_data` → bucle infinito en el front.
  const deps = createMockDeps({
    getPerfilByConvenio: async () => ({
      variables_criticas: ["categoria", "nivel establecimiento"],
      categorias_profesionales: [
        { nombre: "Gobernanta", salario_base_anual: 22000 },
      ],
    }),
  });
  const input = createInput({
    pregunta: "calcula el salario",
    variablesConocidas: {
      categoria: "Gobernanta",
      tipo_establecimiento: "4 estrellas",
    },
    perfil: {
      variables_criticas: ["categoria", "nivel establecimiento"],
      categorias_profesionales: [
        { nombre: "Gobernanta", salario_base_anual: 22000 },
      ],
    },
  });

  const result = await calculateSalary(input, deps);

  // Debe llegar a `salary_calculated`, no volver a pedir `nivel establecimiento`.
  assertEquals(result.type, "salary_calculated");
});
