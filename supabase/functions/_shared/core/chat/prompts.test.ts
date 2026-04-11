/**
 * Tests unitarios para prompts.ts
 *
 * Segun estrategia de testing: testear comportamiento, no implementacion.
 * Los tests verifican que los prompts se construyen correctamente.
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  buildSystemPrompt,
  buildUserMessage,
  formatChunksForContext,
  formatPerfilForContext,
  extractPromptContext,
  type PromptContext,
  type ChunkResult,
  type PerfilContexto,
} from "./prompts.ts";

// ============================================
// Tests de buildSystemPrompt
// ============================================

Deno.test("buildSystemPrompt - ask-question incluye nombre del convenio", () => {
  const context: PromptContext = {
    convenioName: "Hosteleria Valencia",
  };

  const result = buildSystemPrompt("ask-question", context);

  assertStringIncludes(result, "Hosteleria Valencia");
  assertStringIncludes(result, "GROUNDING OBLIGATORIO");
  assertStringIncludes(result, "CITAS OBLIGATORIAS");
});

Deno.test("buildSystemPrompt - ask-question incluye reglas de no alucinacion", () => {
  const context: PromptContext = {
    convenioName: "Consultoras TIC",
  };

  const result = buildSystemPrompt("ask-question", context);

  assertStringIncludes(result, "SIN ALUCINACIONES");
  assertStringIncludes(result, "No encuentro esa informacion");
});

Deno.test("buildSystemPrompt - calculate-salary incluye SMI y ano tablas", () => {
  const context: PromptContext = {
    convenioName: "Hosteleria Valencia",
    anoTablas: "2024",
  };

  const result = buildSystemPrompt("calculate-salary", context);

  assertStringIncludes(result, "Hosteleria Valencia");
  assertStringIncludes(result, "2024");
  assertStringIncludes(result, "CHAIN OF THOUGHT");
  assertStringIncludes(result, "1.221"); // SMI 2026
});

Deno.test("buildSystemPrompt - calculate-salary usa horas anuales del contexto", () => {
  const context: PromptContext = {
    convenioName: "Hosteleria Valencia",
    horasAnuales: 1800,
  };

  const result = buildSystemPrompt("calculate-salary", context);

  assertStringIncludes(result, "1800");
});

Deno.test("buildSystemPrompt - calculate-salary usa valor por defecto si no hay horas", () => {
  const context: PromptContext = {
    convenioName: "Hosteleria Valencia",
  };

  const result = buildSystemPrompt("calculate-salary", context);

  assertStringIncludes(result, "1826"); // Jornada legal
});

Deno.test("buildSystemPrompt - incomplete-data formatea opciones", () => {
  const context: PromptContext = {
    convenioName: "Hosteleria Valencia",
    variablesFaltantes: ["categoria"],
    opcionesVariables: {
      categoria: ["Gobernanta", "Camarera", "Recepcionista"],
    },
  };

  const result = buildSystemPrompt("incomplete-data", context);

  assertStringIncludes(result, "Hosteleria Valencia");
  assertStringIncludes(result, "**Gobernanta**");
  assertStringIncludes(result, "**Camarera**");
  assertStringIncludes(result, "**Recepcionista**");
});

Deno.test("buildSystemPrompt - incomplete-data maneja opciones vacias", () => {
  const context: PromptContext = {
    convenioName: "Test Convenio",
    variablesFaltantes: ["categoria"],
    opcionesVariables: {
      categoria: [],
    },
  };

  const result = buildSystemPrompt("incomplete-data", context);

  assertStringIncludes(result, "Indica tu caso especifico");
});

Deno.test("buildSystemPrompt - incomplete-data sin opcionesVariables no deja placeholder", () => {
  const context: PromptContext = {
    convenioName: "Test Convenio",
    // No opcionesVariables
  };

  const result = buildSystemPrompt("incomplete-data", context);

  // No debe tener el placeholder sin reemplazar
  assertEquals(result.includes("{{opciones}}"), false);
  // Debe tener el fallback
  assertStringIncludes(result, "Indica tu caso especifico");
});

Deno.test("buildSystemPrompt - lanza error con template desconocido", () => {
  const context: PromptContext = { convenioName: "Test" };

  try {
    // @ts-ignore - Testing invalid input
    buildSystemPrompt("invalid-template", context);
    throw new Error("Should have thrown");
  } catch (error) {
    assertStringIncludes((error as Error).message, "Unknown template");
  }
});

// ============================================
// Tests de buildUserMessage
// ============================================

Deno.test("buildUserMessage - incluye chunks formateados", () => {
  const chunks: ChunkResult[] = [
    { content: "Articulo sobre vacaciones...", articulo: "25", similarity: 0.9 },
    { content: "Otro contenido relevante...", similarity: 0.85 },
  ];

  const result = buildUserMessage(chunks, null, "Cuantas vacaciones tengo?");

  assertStringIncludes(result, "CONTEXTO DEL CONVENIO");
  assertStringIncludes(result, "[1] (Art. 25)");
  assertStringIncludes(result, "Articulo sobre vacaciones");
  assertStringIncludes(result, "[2]");
  assertStringIncludes(result, "Cuantas vacaciones tengo?");
});

Deno.test("buildUserMessage - incluye perfil si existe", () => {
  const perfil: PerfilContexto = {
    variables_criticas: ["categoria", "jornada"],
    jornada: { horas_anuales: 1826 },
  };

  const result = buildUserMessage([], perfil, "Pregunta");

  assertStringIncludes(result, "PERFIL DEL CONVENIO");
  assertStringIncludes(result, "categoria, jornada");
  assertStringIncludes(result, "1826 horas");
});

Deno.test("buildUserMessage - incluye variables del usuario", () => {
  const variables = {
    categoria: "Ayudante cocina",
    jornada: "completa",
  };

  const result = buildUserMessage([], null, "Pregunta", variables);

  assertStringIncludes(result, "DATOS DEL USUARIO");
  assertStringIncludes(result, "categoria: Ayudante cocina");
  assertStringIncludes(result, "jornada: completa");
});

Deno.test("buildUserMessage - omite secciones vacias", () => {
  const result = buildUserMessage([], null, "Mi pregunta simple");

  // No debe tener CONTEXTO DEL CONVENIO si no hay chunks
  assertEquals(result.includes("CONTEXTO DEL CONVENIO"), false);
  // No debe tener PERFIL si no hay perfil
  assertEquals(result.includes("PERFIL DEL CONVENIO"), false);
  // No debe tener DATOS DEL USUARIO si no hay variables
  assertEquals(result.includes("DATOS DEL USUARIO"), false);
  // Debe tener la pregunta
  assertStringIncludes(result, "Mi pregunta simple");
});

Deno.test("buildUserMessage - incluye seccion en chunks", () => {
  const chunks: ChunkResult[] = [
    {
      content: "Contenido...",
      articulo: "14",
      seccion: "Jornada laboral",
      similarity: 0.9,
    },
  ];

  const result = buildUserMessage(chunks, null, "Pregunta");

  assertStringIncludes(result, "(Art. 14) - Jornada laboral");
});

// ============================================
// Tests de formatChunksForContext
// ============================================

Deno.test("formatChunksForContext - formatea con indice y articulo", () => {
  const chunks: ChunkResult[] = [
    { content: "Contenido chunk 1", articulo: "14", similarity: 0.9 },
    { content: "Contenido chunk 2", similarity: 0.8 },
  ];

  const result = formatChunksForContext(chunks);

  assertStringIncludes(result, "[1] (Art. 14)");
  assertStringIncludes(result, "Contenido chunk 1");
  assertStringIncludes(result, "[2]");
  assertStringIncludes(result, "Contenido chunk 2");
});

Deno.test("formatChunksForContext - separa chunks con doble newline", () => {
  const chunks: ChunkResult[] = [
    { content: "Chunk A", similarity: 0.9 },
    { content: "Chunk B", similarity: 0.8 },
  ];

  const result = formatChunksForContext(chunks);

  assertStringIncludes(result, "\n\n");
});

Deno.test("formatChunksForContext - maneja array vacio", () => {
  const result = formatChunksForContext([]);
  assertEquals(result, "");
});

// ============================================
// Tests de formatPerfilForContext
// ============================================

Deno.test("formatPerfilForContext - formatea perfil compacto", () => {
  const perfil: PerfilContexto = {
    variables_criticas: ["categoria", "nivel"],
    categorias_profesionales: [
      { nombre: "Gobernanta", salario_base_anual: 20000 },
      { nombre: "Camarera", salario_base_anual: 18000 },
    ],
    jornada: { horas_anuales: 1826 },
    complementos: [{ nombre: "Nocturnidad", valor: 25, tipo: "porcentaje" }],
  };

  const result = formatPerfilForContext(perfil);

  assertStringIncludes(result, "Variables criticas: categoria, nivel");
  assertStringIncludes(result, "Gobernanta (20000 euros/ano)");
  assertStringIncludes(result, "Jornada anual: 1826 horas");
  assertStringIncludes(result, "Nocturnidad (25%)");
});

Deno.test("formatPerfilForContext - limita categorias a 15 por defecto", () => {
  const perfil: PerfilContexto = {
    variables_criticas: [],
    categorias_profesionales: Array.from({ length: 20 }, (_, i) => ({
      nombre: `Categoria${i + 1}`,
    })),
  };

  const result = formatPerfilForContext(perfil);

  // Debe tener solo 15 (límite por defecto de selectRelevantCategories)
  const matches = result.match(/Categoria\d+/g) || [];
  assertEquals(matches.length, 15);
});

Deno.test("formatPerfilForContext - limita complementos a 5", () => {
  const perfil: PerfilContexto = {
    variables_criticas: [],
    complementos: Array.from({ length: 10 }, (_, i) => ({
      nombre: `Complemento${i + 1}`,
    })),
  };

  const result = formatPerfilForContext(perfil);

  // Debe tener solo 5
  const matches = result.match(/Complemento\d+/g) || [];
  assertEquals(matches.length, 5);
});

Deno.test("formatPerfilForContext - incluye ano de tablas salariales", () => {
  const perfil: PerfilContexto = {
    variables_criticas: [],
    tablas_salariales: { ano_referencia: "2024" },
  };

  const result = formatPerfilForContext(perfil);

  assertStringIncludes(result, "Ano tablas salariales: 2024");
});

Deno.test("formatPerfilForContext - formatea complementos con cantidad fija", () => {
  const perfil: PerfilContexto = {
    variables_criticas: [],
    complementos: [{ nombre: "Transporte", valor: 50, tipo: "cantidad_fija" }],
  };

  const result = formatPerfilForContext(perfil);

  assertStringIncludes(result, "Transporte (50 euros)");
});

// ============================================
// Tests de extractPromptContext
// ============================================

Deno.test("extractPromptContext - extrae datos basicos", () => {
  const perfil: PerfilContexto = {
    variables_criticas: ["categoria", "jornada"],
    tablas_salariales: { ano_referencia: "2024" },
    jornada: { horas_anuales: 1800 },
  };

  const result = extractPromptContext(perfil, "Hosteleria Valencia");

  assertEquals(result.convenioName, "Hosteleria Valencia");
  assertEquals(result.anoTablas, "2024");
  assertEquals(result.horasAnuales, 1800);
  assertEquals(result.variablesFaltantes, ["categoria", "jornada"]);
});

Deno.test("extractPromptContext - extrae opciones de categorias", () => {
  const perfil: PerfilContexto = {
    variables_criticas: [],
    categorias_profesionales: [
      { nombre: "Gobernanta" },
      { nombre: "Camarera" },
    ],
  };

  const result = extractPromptContext(perfil, "Test");

  assertEquals(result.opcionesVariables?.categoria, ["Gobernanta", "Camarera"]);
});

Deno.test("extractPromptContext - maneja perfil null", () => {
  const result = extractPromptContext(null, "Test Convenio");

  assertEquals(result.convenioName, "Test Convenio");
  assertEquals(result.anoTablas, undefined);
  assertEquals(result.horasAnuales, undefined);
});
