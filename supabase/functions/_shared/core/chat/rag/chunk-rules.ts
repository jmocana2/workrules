/**
 * Reglas puras de dominio sobre chunks de convenios: qué artículo mostrar,
 * cómo mapear a formato de prompt y cómo construir citaciones para el front.
 *
 * Todo aquí es puro (sin I/O) y testeable sin mocks.
 */

import type { ChunkSearchResult } from "../../../lib/supabase.ts";
import type { ChunkResult } from "../prompts.ts";
import type { ChatCitation } from "../types.ts";

/**
 * Devuelve el artículo utilizable de un chunk.
 * Omite el artículo para:
 * - `tabla_salarial`: suele venir mal referenciado
 * - Contenido de ANEXOS: no tienen artículos numerados
 * - Secciones sin artículo real (clasificación profesional, categorías, etc.)
 */
export function getChunkArticulo(
  metadata: Record<string, unknown>,
): string | undefined {
  const tipo = metadata?.tipo as string | undefined;
  const seccion = (metadata?.seccion as string | undefined)?.toLowerCase() ||
    "";
  const articulo = metadata?.articulo as string | undefined;

  // Tipos que NO deben mostrar artículo
  if (tipo === "tabla_salarial") {
    return undefined;
  }

  // Secciones de ANEXO no tienen artículos numerados
  const esAnexo = seccion.includes("anexo") ||
    seccion.includes("tabla") ||
    seccion.includes("disposicion") ||
    seccion.includes("clasificación profesional") ||
    seccion.includes("clasificacion profesional") ||
    seccion.includes("categorías profesionales") ||
    seccion.includes("categorias profesionales") ||
    seccion.includes("niveles retributivos") ||
    seccion.includes("grupos profesionales");

  if (esAnexo) {
    return undefined;
  }

  return articulo;
}

/**
 * Convierte ChunkSearchResult a ChunkResult para prompts.
 * Ignora el artículo para chunks de tipo "tabla_salarial" ya que suelen tener
 * artículos incorrectos (ej: "Art. 1" cuando realmente son del Anexo).
 */
export function mapChunksToPromptFormat(
  chunks: ChunkSearchResult[],
): ChunkResult[] {
  return chunks.map((c) => {
    const metadata = c.metadata as Record<string, unknown>;

    return {
      content: c.contenido,
      articulo: getChunkArticulo(metadata),
      seccion: metadata?.seccion as string | undefined,
      similarity: c.similarity,
    };
  });
}

/**
 * Construye citaciones desde los chunks usados.
 */
export function buildCitations(
  chunks: ChunkSearchResult[],
  convenioUrlPdf: string | null,
): ChatCitation[] {
  return chunks.map((c) => {
    const metadata = c.metadata as Record<string, unknown>;
    const pagina = typeof metadata?.pagina === "number"
      ? metadata.pagina
      : null;

    return {
      articulo: getChunkArticulo(metadata),
      seccion: (metadata?.seccion as string) || null,
      chunk_id: c.chunk_id,
      relevance_score: c.similarity,
      url_pdf: convenioUrlPdf,
      pagina,
    };
  });
}
