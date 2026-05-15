-- ============================================
-- RESET Y PREPARAR PARA RE-INDEXAR CONVENIOS
-- ============================================
-- Ejecutar antes de lanzar el indexer en n8n
-- Preserva usuarios y auth

-- 1. Limpiar datos de convenios
TRUNCATE TABLE convenio_chunks CASCADE;
TRUNCATE TABLE convenio_perfiles CASCADE;
TRUNCATE TABLE convenio_versiones CASCADE;
TRUNCATE TABLE chat_messages CASCADE;
TRUNCATE TABLE chat_sessions CASCADE;
TRUNCATE TABLE semantic_cache CASCADE;
TRUNCATE TABLE convenios CASCADE;

-- 2. Crear bucket de storage para PDFs (si no existe)
INSERT INTO storage.buckets (id, name, public)
VALUES ('convenios-pdf', 'convenios-pdf', false)
ON CONFLICT (id) DO UPDATE
SET public = false;

-- 3. Asegurar columnas nombre_oficial / ambito_territorial (idempotente).
--    Ver supabase/snippets/add-nombre-oficial-ambito-territorial.sql para detalle.
ALTER TABLE convenios
  ADD COLUMN IF NOT EXISTS nombre_oficial      text,
  ADD COLUMN IF NOT EXISTS nombre_corto        text,
  ADD COLUMN IF NOT EXISTS ambito_territorial  text;
