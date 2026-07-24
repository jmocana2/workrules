// supabase/functions/_shared/core/chat/http/result-mapper.ts

import type { AskQuestionResult } from "../ask-question/index.ts";
import type { CalculateSalaryResult } from "../calculate-salary/index.ts";
import type { ChatMetadata } from "../types.ts";
import type { ChatHandlerResponse } from "./error-response.ts";

/** Resultado combinado de ambos UseCases */
export type ChatUseCaseResult = AskQuestionResult | CalculateSalaryResult;

/**
 * Mapea resultado del UseCase a respuesta HTTP
 */
export function mapResultToHttpResponse(
  result: ChatUseCaseResult,
): ChatHandlerResponse {
  switch (result.type) {
    case "success":
    case "cache_hit":
      return {
        status: 200,
        body: {
          status: "ok",
          respuesta: result.response,
          fuentes: result.citations,
          metadata: buildMetadata(result.metadata, "general"),
        },
      };

    case "salary_calculated":
      return {
        status: 200,
        body: {
          status: "ok",
          respuesta: result.response,
          fuentes: result.citations,
          desglose: result.desglose,
          metadata: buildMetadata(result.metadata, "salary"),
        },
      };

    case "incomplete_data":
      return {
        status: 200,
        body: {
          status: "incomplete",
          respuesta: result.message,
          missingVariables: result.missingVariables,
          suggestions: result.suggestions,
          fuentes: result.citations ?? [],
          metadata: {
            classification: "incomplete",
          },
        },
      };

    case "invalid_data":
      return {
        status: 400,
        body: {
          status: "error",
          error: result.message,
          invalidVariables: result.invalidVariables,
          conflictingVariables: result.conflictingVariables,
          fuentes: result.citations ?? [],
          metadata: {
            classification: "invalid",
          },
        },
      };

    case "quota_exceeded":
      return {
        status: 429,
        body: {
          status: "error",
          error: result.message,
        },
      };

    case "not_found":
      return {
        status: 404,
        body: {
          status: "error",
          error: result.message,
        },
      };

    case "error":
      return {
        status: 500,
        body: {
          status: "error",
          error: result.message,
          code: result.code,
        },
      };

    case "stream":
      return {
        status: 500,
        body: {
          status: "error",
          error: "Stream result should not be mapped to HTTP response",
        },
      };

    default:
      return {
        status: 500,
        body: {
          status: "error",
          error: "Unknown result type",
        },
      };
  }
}

function buildMetadata(
  meta: {
    cacheHit: boolean;
    chunksUsed: number;
    model: string;
    latencyMs: number;
  },
  classification: "general" | "salary",
): ChatMetadata {
  return {
    model: meta.model,
    tokens_used: 0,
    chunks_retrieved: meta.chunksUsed,
    cache_hit: meta.cacheHit,
    classification,
    latency_ms: meta.latencyMs,
  };
}
