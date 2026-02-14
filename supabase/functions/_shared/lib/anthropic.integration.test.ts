/**
 * Test de integracion para el servicio de Anthropic
 * Requiere ANTHROPIC_API_KEY configurada
 *
 * Ejecutar con:
 * ANTHROPIC_API_KEY=sk-ant-... deno test --allow-env --allow-net _shared/lib/anthropic.integration.test.ts
 *
 * @module anthropic.integration.test
 */

import { assertEquals } from "@std/assert";
import { createChatResponse, streamChatResponse } from "./anthropic.ts";

Deno.test({
  name: "createChatResponse - integracion real con Anthropic API",
  ignore: !Deno.env.get("ANTHROPIC_API_KEY"),
  fn: async () => {
    console.log("Llamando a Anthropic API...");
    const startTime = Date.now();

    const response = await createChatResponse({
      systemPrompt: "Responde en una sola linea corta, sin emojis.",
      userMessage: "Di exactamente: 'Hola desde WorkRules'",
    });

    const elapsed = Date.now() - startTime;
    console.log(`Respuesta en ${elapsed}ms`);
    console.log(`Response: ${response}`);

    assertEquals(typeof response, "string");
    assertEquals(response.length > 0, true);
    assertEquals(response.toLowerCase().includes("workrules"), true);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "streamChatResponse - integracion real streaming",
  ignore: !Deno.env.get("ANTHROPIC_API_KEY"),
  fn: async () => {
    console.log("Llamando a Anthropic API con streaming...");

    const stream = await streamChatResponse({
      systemPrompt: "Responde brevemente, sin emojis.",
      userMessage: "Cuenta del 1 al 5.",
    });

    // Leer el stream
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let fullResponse = "";
    let chunkCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value);
      fullResponse += text;
      chunkCount++;
    }

    console.log(`Recibidos ${chunkCount} chunks`);
    console.log(`Response completa:\n${fullResponse}`);

    assertEquals(chunkCount > 1, true); // Debe haber multiples chunks
    assertEquals(fullResponse.includes("data:"), true); // Formato SSE
    assertEquals(fullResponse.includes('"type":"text"'), true); // Tiene contenido text
    assertEquals(fullResponse.includes('"type":"done"'), true); // Tiene evento done
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "streamChatResponse - formato SSE correcto",
  ignore: !Deno.env.get("ANTHROPIC_API_KEY"),
  fn: async () => {
    console.log("Verificando formato SSE...");

    const stream = await streamChatResponse({
      systemPrompt: "Di solo 'OK'.",
      userMessage: "Confirma.",
    });

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let fullResponse = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullResponse += decoder.decode(value);
    }

    // Verificar formato SSE
    const lines = fullResponse.split("\n\n").filter((l) =>
      l.startsWith("data:")
    );

    console.log(`Eventos SSE: ${lines.length}`);

    for (const line of lines) {
      const jsonStr = line.replace(/^data:\s?/, "");
      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (e) {
        throw new Error(`Failed to parse SSE event: "${line}" - ${e}`);
      }

      // Cada evento debe tener type
      assertEquals("type" in parsed, true);
      assertEquals(["text", "done", "error"].includes(parsed.type), true);

      if (parsed.type === "text") {
        assertEquals("content" in parsed, true);
      }
    }

    console.log("Formato SSE verificado correctamente");
  },
  sanitizeOps: false,
  sanitizeResources: false,
});
