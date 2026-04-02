-- =============================================================================
-- Setup Storage Bucket para n8n Local
-- =============================================================================
-- Ejecutar en Supabase Studio: http://127.0.0.1:54323
-- SQL Editor > New Query > Pegar y ejecutar
-- =============================================================================

-- Crear bucket privado para PDFs de convenios
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'convenios-pdf',
  'convenios-pdf',
  false,
  52428800,  -- 50MB max
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf'];

-- El workflow de n8n ya sube al bucket `convenios-pdf` usando credenciales autenticadas.
-- Para descargas, usa signed URLs o requests autenticadas; no expongas rutas públicas del bucket.

-- Verificar que se creo
SELECT id, name, public, created_at FROM storage.buckets WHERE id = 'convenios-pdf';
