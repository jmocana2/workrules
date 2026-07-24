// supabase/functions/_shared/application/ports/semantic-cache.ts

import type { CacheHit } from "./dtos.ts";

/** Caché semántica de respuestas. */
export interface SemanticCacheStore {
  search(
    embedding: number[],
    convenioId: string,
    threshold?: number,
  ): Promise<CacheHit | null>;
  save(
    embedding: number[],
    query: string,
    response: string,
    convenioId: string,
    citations?: Record<string, unknown>[],
  ): Promise<void>;
}
