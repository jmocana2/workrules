DROP FUNCTION IF EXISTS search_semantic_cache;

  CREATE OR REPLACE FUNCTION search_semantic_cache(
      p_query_embedding vector(1536),
      similarity_threshold float DEFAULT 0.95,
      p_convenio_id UUID DEFAULT NULL
  )
  RETURNS TABLE (
      cache_id UUID,
      cached_response TEXT,
      similarity float,
      hit_count INTEGER
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  BEGIN
      RETURN QUERY
      SELECT
          sc.id as cache_id,
          sc.response as cached_response,
          1 - (sc.query_embedding <=> p_query_embedding) as similarity,
          sc.hit_count
      FROM semantic_cache sc
      WHERE
          sc.expires_at > CURRENT_TIMESTAMP
          AND 1 - (sc.query_embedding <=> p_query_embedding) > similarity_threshold
          AND (p_convenio_id IS NULL OR sc.convenio_id = p_convenio_id)
      ORDER BY sc.query_embedding <=> p_query_embedding
      LIMIT 1;
  END;
  $$;