-- =============================================================================
-- Fix: GRANTs perdidos al recrear schema public + drift de policy de convenios
-- =============================================================================
-- Contexto: tras DROP SCHEMA public CASCADE, los roles anon/authenticated/service_role
-- perdieron sus privilegios sobre objetos del schema, causando 403 (42501) en remoto.
-- Además la policy "convenios_visibility" no contemplaba el estado 'activo_sin_perfil'
-- que el frontend filtra junto con 'activo'.
-- =============================================================================

-- 1) Restaurar GRANTs por defecto que Supabase asigna a los roles del API REST.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES    IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON TABLES    TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

-- 2) Recrear la policy de SELECT sobre convenios incluyendo 'activo_sin_perfil'.
DROP POLICY IF EXISTS "convenios_visibility" ON convenios;

CREATE POLICY "convenios_visibility"
    ON convenios FOR SELECT
    USING (
        (visibilidad = 'publico' AND estado IN ('activo', 'activo_sin_perfil'))
        OR (owner_id = auth.uid())
        OR (owner_id IS NULL AND estado IN ('activo', 'activo_sin_perfil'))
    );
