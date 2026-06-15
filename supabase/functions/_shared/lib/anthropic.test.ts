/**
 * Tests unitarios para el servicio de Anthropic
 *
 * @module anthropic.test
 */

import { assertEquals, assertRejects } from "@std/assert";
import {
  AnthropicError,
  createChatResponse,
  streamChatResponse,
  validateOptions,
} from "./anthropic.ts";

// ============================================
// Tests de validateOptions
// ============================================

Deno.test("validateOptions - rechaza null", () => {
  try {
    validateOptions(null);
    throw new Error("Should have thrown");
  } catch (error) {
    assertEquals(error instanceof AnthropicError, true);
    assertEquals((error as AnthropicError).code, "INVALID_INPUT");
  }
});

Deno.test("validateOptions - rechaza undefined", () => {
  try {
    validateOptions(undefined);
    throw new Error("Should have thrown");
  } catch (error) {
    assertEquals(error instanceof AnthropicError, true);
    assertEquals((error as AnthropicError).code, "INVALID_INPUT");
  }
});

Deno.test("validateOptions - rechaza string", () => {
  try {
    validateOptions("not an object");
    throw new Error("Should have thrown");
  } catch (error) {
    assertEquals(error instanceof AnthropicError, true);
    assertEquals((error as AnthropicError).message, "Options object is required");
  }
});

Deno.test("validateOptions - rechaza sin systemPrompt", () => {
  try {
    validateOptions({ userMessage: "test" });
    throw new Error("Should have thrown");
  } catch (error) {
    assertEquals(error instanceof AnthropicError, true);
    assertEquals((error as AnthropicError).message, "systemPrompt is required");
  }
});

Deno.test("validateOptions - rechaza sin userMessage", () => {
  try {
    validateOptions({ systemPrompt: "test" });
    throw new Error("Should have thrown");
  } catch (error) {
    assertEquals(error instanceof AnthropicError, true);
    assertEquals((error as AnthropicError).message, "userMessage is required");
  }
});

Deno.test("validateOptions - rechaza systemPrompt vacio", () => {
  try {
    validateOptions({ systemPrompt: "   ", userMessage: "test" });
    throw new Error("Should have thrown");
  } catch (error) {
    assertEquals(error instanceof AnthropicError, true);
    assertEquals((error as AnthropicError).message, "systemPrompt cannot be empty");
  }
});

Deno.test("validateOptions - rechaza userMessage vacio", () => {
  try {
    validateOptions({ systemPrompt: "test", userMessage: "   " });
    throw new Error("Should have thrown");
  } catch (error) {
    assertEquals(error instanceof AnthropicError, true);
    assertEquals((error as AnthropicError).message, "userMessage cannot be empty");
  }
});

Deno.test("validateOptions - rechaza systemPrompt no string", () => {
  try {
    validateOptions({ systemPrompt: 123, userMessage: "test" });
    throw new Error("Should have thrown");
  } catch (error) {
    assertEquals(error instanceof AnthropicError, true);
    assertEquals((error as AnthropicError).message, "systemPrompt is required");
  }
});

Deno.test("validateOptions - rechaza userMessage no string", () => {
  try {
    validateOptions({ systemPrompt: "test", userMessage: 123 });
    throw new Error("Should have thrown");
  } catch (error) {
    assertEquals(error instanceof AnthropicError, true);
    assertEquals((error as AnthropicError).message, "userMessage is required");
  }
});

Deno.test("validateOptions - acepta opciones validas minimas", () => {
  const result = validateOptions({
    systemPrompt: "System",
    userMessage: "User",
  });

  assertEquals(result.systemPrompt, "System");
  assertEquals(result.userMessage, "User");
  assertEquals(result.model, "claude-sonnet-4-5");
  assertEquals(result.maxTokens, 2048);
  assertEquals(result.temperature, 0.3);
});

Deno.test("validateOptions - respeta opciones custom", () => {
  const result = validateOptions({
    systemPrompt: "System",
    userMessage: "User",
    model: "claude-3-haiku-20240307",
    maxTokens: 1024,
    temperature: 0.7,
  });

  assertEquals(result.model, "claude-3-haiku-20240307");
  assertEquals(result.maxTokens, 1024);
  assertEquals(result.temperature, 0.7);
});

Deno.test("validateOptions - acepta temperature 0", () => {
  const result = validateOptions({
    systemPrompt: "System",
    userMessage: "User",
    temperature: 0,
  });

  assertEquals(result.temperature, 0);
});

// ============================================
// Tests de streamChatResponse
// ============================================

Deno.test("streamChatResponse - falla sin API key", async () => {
  const originalKey = Deno.env.get("ANTHROPIC_API_KEY");
  Deno.env.delete("ANTHROPIC_API_KEY");

  try {
    await assertRejects(
      () =>
        streamChatResponse({
          systemPrompt: "test",
          userMessage: "test",
        }),
      AnthropicError,
      "Missing ANTHROPIC_API_KEY",
    );
  } finally {
    if (originalKey) {
      Deno.env.set("ANTHROPIC_API_KEY", originalKey);
    }
  }
});

Deno.test("streamChatResponse - falla con systemPrompt vacio", async () => {
  const originalKey = Deno.env.get("ANTHROPIC_API_KEY");
  Deno.env.set("ANTHROPIC_API_KEY", "test-key");

  try {
    await assertRejects(
      () =>
        streamChatResponse({
          systemPrompt: "   ", // Solo espacios pasa la validacion de falsy pero falla en trim
          userMessage: "test",
        }),
      AnthropicError,
      "empty",
    );
  } finally {
    if (originalKey) {
      Deno.env.set("ANTHROPIC_API_KEY", originalKey);
    } else {
      Deno.env.delete("ANTHROPIC_API_KEY");
    }
  }
});

Deno.test("streamChatResponse - falla con userMessage vacio", async () => {
  const originalKey = Deno.env.get("ANTHROPIC_API_KEY");
  Deno.env.set("ANTHROPIC_API_KEY", "test-key");

  try {
    await assertRejects(
      () =>
        streamChatResponse({
          systemPrompt: "test",
          userMessage: "   ", // Solo espacios pasa la validacion de falsy pero falla en trim
        }),
      AnthropicError,
      "empty",
    );
  } finally {
    if (originalKey) {
      Deno.env.set("ANTHROPIC_API_KEY", originalKey);
    } else {
      Deno.env.delete("ANTHROPIC_API_KEY");
    }
  }
});

// ============================================
// Tests de createChatResponse
// ============================================

Deno.test("createChatResponse - falla sin API key", async () => {
  const originalKey = Deno.env.get("ANTHROPIC_API_KEY");
  Deno.env.delete("ANTHROPIC_API_KEY");

  try {
    await assertRejects(
      () =>
        createChatResponse({
          systemPrompt: "test",
          userMessage: "test",
        }),
      AnthropicError,
      "Missing ANTHROPIC_API_KEY",
    );
  } finally {
    if (originalKey) {
      Deno.env.set("ANTHROPIC_API_KEY", originalKey);
    }
  }
});

Deno.test("createChatResponse - falla con input invalido", async () => {
  const originalKey = Deno.env.get("ANTHROPIC_API_KEY");
  Deno.env.set("ANTHROPIC_API_KEY", "test-key");

  try {
    await assertRejects(
      () =>
        createChatResponse({
          systemPrompt: "  ",
          userMessage: "test",
        }),
      AnthropicError,
      "empty",
    );
  } finally {
    if (originalKey) {
      Deno.env.set("ANTHROPIC_API_KEY", originalKey);
    } else {
      Deno.env.delete("ANTHROPIC_API_KEY");
    }
  }
});

// ============================================
// Tests de AnthropicError
// ============================================

Deno.test("AnthropicError - tiene propiedades correctas", () => {
  const error = new AnthropicError("Test error", "RATE_LIMIT", true, { extra: "data" });

  assertEquals(error.name, "AnthropicError");
  assertEquals(error.message, "Test error");
  assertEquals(error.code, "RATE_LIMIT");
  assertEquals(error.retryable, true);
  assertEquals(error.details, { extra: "data" });
});

Deno.test("AnthropicError - es instancia de Error", () => {
  const error = new AnthropicError("Test", "API_ERROR", false);
  assertEquals(error instanceof Error, true);
  assertEquals(error instanceof AnthropicError, true);
});

Deno.test("AnthropicError - funciona sin details", () => {
  const error = new AnthropicError("Test", "AUTH_ERROR", false);
  assertEquals(error.details, undefined);
});

Deno.test("AnthropicError - soporta todos los codigos", () => {
  const codes = ["INVALID_INPUT", "API_ERROR", "RATE_LIMIT", "OVERLOADED", "AUTH_ERROR"] as const;

  for (const code of codes) {
    const error = new AnthropicError("Test", code, code === "RATE_LIMIT");
    assertEquals(error.code, code);
  }
});
