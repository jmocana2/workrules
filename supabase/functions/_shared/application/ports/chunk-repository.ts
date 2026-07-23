// supabase/functions/_shared/application/ports/chunk-repository.ts

import type { RetrievedChunk } from "./dtos.ts";

/** Repositorio de chunks indexados de convenios. */
export interface ChunkRepository {
  searchByConvenio(
    embedding: number[],
    convenioId: string,
    limit?: number,
    threshold?: number,
  ): Promise<RetrievedChunk[]>;
  getByGroup(
    convenioId: string,
    key: "articulo" | "seccion",
    value: string,
  ): Promise<RetrievedChunk[]>;
}
