// supabase/functions/_shared/application/ports/dtos.ts
//
// DTOs neutrales de la capa de aplicación. Los puertos hablan en estos tipos,
// no en tipos de infraestructura (filas de Supabase, SDK de Anthropic, etc.).
// Los adapters de `infrastructure/` traducen de/a estos DTOs.

/** Chunk recuperado por búsqueda semántica o por agrupación. */
export interface RetrievedChunk {
  chunkId: string;
  convenioId: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

/** Resumen de convenio expuesto a la capa de aplicación. */
export interface ConvenioSummary {
  id: string;
  nombre: string;
  nombreOficial: string | null;
  nombreCorto: string | null;
  codigoRegcon: string;
  ambito: string;
  ambitoTerritorial: string | null;
  fechaVigencia: string;
  estado: string;
  urlPdf: string | null;
}

/** Estado de cuota de usuario. */
export interface QuotaStatus {
  hasQuota: boolean;
  used: number;
  limit: number;
  tier: "free" | "premium" | "enterprise";
}

/** Hit de caché semántica. */
export interface CacheHit {
  cacheId: string;
  response: string;
  similarity: number;
  hitCount: number;
  citations: Record<string, unknown>[];
}

/** Request neutral al LLM. No expone opciones específicas de un proveedor. */
export interface LlmChatRequest {
  systemPrompt: string;
  userMessage: string;
  /** Modelo lógico (el adapter lo mapea al identificador del proveedor). */
  model?: string;
  maxTokens?: number;
  /** Temperature en rango 0-1. */
  temperature?: number;
}
