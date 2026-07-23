// supabase/functions/_shared/infrastructure/supabase/chunk-repository.ts

import type { ChunkRepository } from "../../application/ports/chunk-repository.ts";
import type { RetrievedChunk } from "../../application/ports/dtos.ts";
import type { ChunkSearchResult } from "../../lib/supabase.ts";
import {
  getChunksByGroup,
  searchChunksByConvenio,
} from "../../lib/supabase.ts";

const mapChunk = (row: ChunkSearchResult): RetrievedChunk => ({
  chunkId: row.chunk_id,
  convenioId: row.convenio_id,
  content: row.contenido,
  metadata: row.metadata,
  similarity: row.similarity,
});

export const supabaseChunkRepository: ChunkRepository = {
  async searchByConvenio(embedding, convenioId, limit, threshold) {
    const rows = await searchChunksByConvenio(
      embedding,
      convenioId,
      limit,
      threshold,
    );
    return rows.map(mapChunk);
  },
  async getByGroup(convenioId, key, value) {
    const rows = await getChunksByGroup(convenioId, key, value);
    return rows.map(mapChunk);
  },
};
