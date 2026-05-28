-- =============================================================================
-- Hardening: fijar search_path en funciones SECURITY DEFINER
-- =============================================================================
-- Las funciones SECURITY DEFINER se ejecutan con privilegios del owner (postgres).
-- Sin un search_path fijo, el caller puede manipular el suyo para que la función
-- resuelva nombres de tabla/función contra un schema controlado por él, abriendo
-- una vía de escalada de privilegios (CVE-2018-1058).
--
-- Fijamos search_path = public en las 5 funciones que faltaban.
-- (count_recent_chat_requests y handle_new_user ya lo tienen.)
-- =============================================================================

ALTER FUNCTION public.increment_query_count(UUID)
    SET search_path = public;

ALTER FUNCTION public.count_recent_uploads(UUID, INTEGER)
    SET search_path = public;

ALTER FUNCTION public.search_similar_chunks(vector, float, int)
    SET search_path = public;

ALTER FUNCTION public.search_chunks_by_convenio(vector, UUID, float, int)
    SET search_path = public;

ALTER FUNCTION public.search_semantic_cache(vector, float, UUID)
    SET search_path = public;
