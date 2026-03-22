-- =============================================================================
-- Setup Storage Bucket para n8n Local
-- =============================================================================
-- Ejecutar en Supabase Studio: http://127.0.0.1:54323
-- SQL Editor > New Query > Pegar y ejecutar
-- =============================================================================

-- Crear bucket para PDFs de convenios
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'convenios-pdf',
  'convenios-pdf',
  true,
  52428800,  -- 50MB max
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf'];
-- Politica para permitir uploads desde n8n (usando service role, bypasa RLS)
-- No se necesita politica adicional si usamos service_role_key

-- Verificar que se creo
SELECT id, name, public, created_at FROM storage.buckets WHERE id = 'convenios-pdf';
