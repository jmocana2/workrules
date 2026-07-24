// supabase/functions/_shared/infrastructure/supabase/semantic-cache.ts

import type { SemanticCacheStore } from "../../application/ports/semantic-cache.ts";
import type { CacheHit } from "../../application/ports/dtos.ts";
import type { CacheHit as DbCacheHit } from "../../lib/supabase.ts";
import { saveToSemanticCache, searchSemanticCache } from "../../lib/supabase.ts";

const mapCacheHit = (row: DbCacheHit): CacheHit => ({
  cacheId: row.cache_id,
  response: row.response,
  similarity: row.similarity,
  hitCount: row.hit_count,
  citations: row.citations,
});

export const supabaseSemanticCache: SemanticCacheStore = {
  async search(embedding, convenioId, threshold) {
    const row = await searchSemanticCache(embedding, convenioId, threshold);
    return row ? mapCacheHit(row) : null;
  },
  save: (embedding, query, response, convenioId, citations) =>
    saveToSemanticCache(embedding, query, response, convenioId, citations),
};
