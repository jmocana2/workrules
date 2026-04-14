// supabase/functions/upload-convenio/index.test.ts

import { assertEquals, assertExists } from "@std/assert";

// ============================================
// Helper functions (extracted for testing)
// ============================================

function cleanFileName(fileName: string): string {
  return fileName
    .trim()
    .replace(/\.pdf$/i, "")
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .trim();
}

function validateRequest(
  body: unknown,
): {
  valid: boolean;
  error?: string;
  data?: {
    file_url: string;
    nombre_archivo: string;
    visibilidad: "publico" | "privado";
  };
} {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be an object" };
  }

  const { file_url, nombre_archivo, visibilidad } = body as Record<
    string,
    unknown
  >;

  if (!file_url || typeof file_url !== "string") {
    return { valid: false, error: "file_url is required and must be a string" };
  }

  if (!nombre_archivo || typeof nombre_archivo !== "string") {
    return {
      valid: false,
      error: "nombre_archivo is required and must be a string",
    };
  }

  if (
    visibilidad !== "publico" && visibilidad !== "privado" &&
    visibilidad !== undefined
  ) {
    return {
      valid: false,
      error: "visibilidad must be 'publico' or 'privado'",
    };
  }

  return {
    valid: true,
    data: {
      file_url,
      nombre_archivo,
      visibilidad: (visibilidad as "publico" | "privado") || "privado",
    },
  };
}

// ============================================
// Tests for cleanFileName
// ============================================

Deno.test("cleanFileName - removes .pdf extension", () => {
  assertEquals(cleanFileName("convenio.pdf"), "convenio");
  assertEquals(cleanFileName("CONVENIO.PDF"), "CONVENIO");
});

Deno.test("cleanFileName - replaces hyphens with spaces", () => {
  assertEquals(
    cleanFileName("convenio-hosteleria-madrid.pdf"),
    "convenio hosteleria madrid",
  );
});

Deno.test("cleanFileName - replaces underscores with spaces", () => {
  assertEquals(
    cleanFileName("convenio_hosteleria_madrid.pdf"),
    "convenio hosteleria madrid",
  );
});

Deno.test("cleanFileName - handles mixed separators", () => {
  assertEquals(
    cleanFileName("convenio-hosteleria_madrid.pdf"),
    "convenio hosteleria madrid",
  );
});

Deno.test("cleanFileName - trims whitespace", () => {
  assertEquals(cleanFileName("  convenio.pdf  "), "convenio");
});

Deno.test("cleanFileName - handles files without extension", () => {
  assertEquals(cleanFileName("convenio-sin-extension"), "convenio sin extension");
});

// ============================================
// Tests for validateRequest
// ============================================

Deno.test("validateRequest - accepts valid request with all fields", () => {
  const body = {
    file_url: "https://example.com/test.pdf",
    nombre_archivo: "test.pdf",
    visibilidad: "privado",
  };

  const result = validateRequest(body);

  assertEquals(result.valid, true);
  assertExists(result.data);
  assertEquals(result.data.file_url, "https://example.com/test.pdf");
  assertEquals(result.data.nombre_archivo, "test.pdf");
  assertEquals(result.data.visibilidad, "privado");
});

Deno.test("validateRequest - accepts valid request without visibilidad (defaults to privado)", () => {
  const body = {
    file_url: "https://example.com/test.pdf",
    nombre_archivo: "test.pdf",
  };

  const result = validateRequest(body);

  assertEquals(result.valid, true);
  assertExists(result.data);
  assertEquals(result.data.visibilidad, "privado");
});

Deno.test("validateRequest - accepts visibilidad=publico", () => {
  const body = {
    file_url: "https://example.com/test.pdf",
    nombre_archivo: "test.pdf",
    visibilidad: "publico",
  };

  const result = validateRequest(body);

  assertEquals(result.valid, true);
  assertExists(result.data);
  assertEquals(result.data.visibilidad, "publico");
});

Deno.test("validateRequest - rejects null body", () => {
  const result = validateRequest(null);

  assertEquals(result.valid, false);
  assertEquals(result.error, "Request body must be an object");
});

Deno.test("validateRequest - rejects non-object body", () => {
  const result = validateRequest("string");

  assertEquals(result.valid, false);
  assertEquals(result.error, "Request body must be an object");
});

Deno.test("validateRequest - rejects missing file_url", () => {
  const body = {
    nombre_archivo: "test.pdf",
  };

  const result = validateRequest(body);

  assertEquals(result.valid, false);
  assertEquals(result.error, "file_url is required and must be a string");
});

Deno.test("validateRequest - rejects non-string file_url", () => {
  const body = {
    file_url: 123,
    nombre_archivo: "test.pdf",
  };

  const result = validateRequest(body);

  assertEquals(result.valid, false);
  assertEquals(result.error, "file_url is required and must be a string");
});

Deno.test("validateRequest - rejects missing nombre_archivo", () => {
  const body = {
    file_url: "https://example.com/test.pdf",
  };

  const result = validateRequest(body);

  assertEquals(result.valid, false);
  assertEquals(result.error, "nombre_archivo is required and must be a string");
});

Deno.test("validateRequest - rejects non-string nombre_archivo", () => {
  const body = {
    file_url: "https://example.com/test.pdf",
    nombre_archivo: 456,
  };

  const result = validateRequest(body);

  assertEquals(result.valid, false);
  assertEquals(result.error, "nombre_archivo is required and must be a string");
});

Deno.test("validateRequest - rejects invalid visibilidad", () => {
  const body = {
    file_url: "https://example.com/test.pdf",
    nombre_archivo: "test.pdf",
    visibilidad: "invalid",
  };

  const result = validateRequest(body);

  assertEquals(result.valid, false);
  assertEquals(result.error, "visibilidad must be 'publico' or 'privado'");
});

Deno.test("validateRequest - handles empty string file_url", () => {
  const body = {
    file_url: "",
    nombre_archivo: "test.pdf",
  };

  const result = validateRequest(body);

  assertEquals(result.valid, false);
  assertEquals(result.error, "file_url is required and must be a string");
});

Deno.test("validateRequest - handles empty string nombre_archivo", () => {
  const body = {
    file_url: "https://example.com/test.pdf",
    nombre_archivo: "",
  };

  const result = validateRequest(body);

  assertEquals(result.valid, false);
  assertEquals(result.error, "nombre_archivo is required and must be a string");
});
