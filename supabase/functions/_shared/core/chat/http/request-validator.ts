// supabase/functions/_shared/core/chat/http/request-validator.ts

import type { ChatRequest } from "../types.ts";

export interface ValidationResult {
  valid: boolean;
  error?: string;
  fields?: string[];
}

/**
 * Valida el body de una petición de chat
 */
export function validateChatRequest(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") {
    return {
      valid: false,
      error: "Invalid request body",
    };
  }

  const request = body as Partial<ChatRequest>;
  const missingFields: string[] = [];

  if (!request.convenio_id) {
    missingFields.push("convenio_id");
  }

  if (!request.pregunta) {
    missingFields.push("pregunta");
  }

  if (missingFields.length > 0) {
    return {
      valid: false,
      error: "Missing required fields",
      fields: missingFields,
    };
  }

  if (typeof request.convenio_id !== "string") {
    return {
      valid: false,
      error: "convenio_id must be a string",
    };
  }

  if (request.convenio_id.trim().length === 0) {
    return {
      valid: false,
      error: "convenio_id must not be blank",
    };
  }

  if (typeof request.pregunta !== "string") {
    return {
      valid: false,
      error: "pregunta must be a string",
    };
  }

  if (request.pregunta.trim().length < 3) {
    return {
      valid: false,
      error: "pregunta must be at least 3 characters",
    };
  }

  return { valid: true };
}

/**
 * Parsea el body de la request de forma segura
 */
export async function parseRequestBody(req: Request): Promise<{
  data: unknown;
  error?: string;
}> {
  try {
    const data = await req.json();
    return { data };
  } catch {
    return {
      data: null,
      error: "Invalid JSON body",
    };
  }
}
