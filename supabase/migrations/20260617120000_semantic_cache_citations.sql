-- =============================================================================
-- Migración: añadir citations al semantic_cache
-- =============================================================================
-- Persistir las citas (artículo, sección, página, url_pdf) junto a la respuesta
-- para que los cache hits devuelvan también las referencias al PDF y no solo
-- el texto. Antes de este cambio, una respuesta servida desde el cache no
-- incluía citas y el frontend no podía ofrecer el botón "abrir PDF".
-- =============================================================================

ALTER TABLE semantic_cache
    ADD COLUMN IF NOT EXISTS citations jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN semantic_cache.citations IS
    'Array de citas (ChatCitation[]) asociadas a la respuesta cacheada';

-- Actualizar la función RPC para devolver también las citas
CREATE OR REPLACE FUNCTION search_semantic_cache(
    p_query_embedding vector(1536),
    similarity_threshold float DEFAULT 0.95,
    p_convenio_id UUID DEFAULT NULL
)
RETURNS TABLE (
    cache_id UUID,
    cached_response TEXT,
    similarity float,
    hit_count INTEGER,
    citations jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        sc.id as cache_id,
        sc.response as cached_response,
        1 - (sc.query_embedding <=> p_query_embedding) as similarity,
        sc.hit_count,
        sc.citations
    FROM semantic_cache sc
    WHERE
        sc.expires_at > CURRENT_TIMESTAMP
        AND 1 - (sc.query_embedding <=> p_query_embedding) > similarity_threshold
        AND (p_convenio_id IS NULL OR sc.convenio_id = p_convenio_id)
    ORDER BY sc.query_embedding <=> p_query_embedding
    LIMIT 1;
END;
$$;

COMMENT ON FUNCTION search_semantic_cache IS
    'Busca en el caché semántico respuestas similares (incluye citaciones)';
