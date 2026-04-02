# Reset Base de Datos y Re-indexar Convenio

Instrucciones para Claude Code para limpiar la base de datos local y re-indexar un convenio desde cero.

## Prerequisitos

- Supabase local corriendo (`supabase status`)
- n8n corriendo en http://localhost:5678
- Workflow "Workrules-Indexer" activado en n8n

## Paso 1: Reset de Base de Datos (preservando usuarios)

Indicar al usuario que ejecute en Supabase Studio (http://127.0.0.1:54323 > SQL Editor):

```sql
-- Limpiar datos de convenios (preserva usuarios y auth)
TRUNCATE TABLE convenio_chunks CASCADE;
TRUNCATE TABLE convenio_perfiles CASCADE;
TRUNCATE TABLE convenio_versiones CASCADE;
TRUNCATE TABLE chat_messages CASCADE;
TRUNCATE TABLE chat_sessions CASCADE;
TRUNCATE TABLE semantic_cache CASCADE;
TRUNCATE TABLE convenios CASCADE;
```

## Paso 2: Crear Bucket de Storage (si no existe)

Indicar al usuario que ejecute en Supabase Studio:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('convenios-pdf', 'convenios-pdf', false)
ON CONFLICT (id) DO UPDATE
SET public = false;
```

> **Nota**: El bucket queda **privado**. Mantén las subidas con credenciales autenticadas y usa **signed URLs** o requests autenticadas para las descargas; no expongas URLs públicas del bucket.

## Paso 3: Lanzar Indexer

Claude Code ejecuta:

```bash
curl -X POST http://localhost:5678/webhook/ingesta-convenio -H "Content-Type: application/json" -d "{\"nombre\": \"Convenio Colectivo de Hosteleria de Madrid\", \"codigo_regcon\": \"28000005011981\", \"ambito\": \"provincial\", \"fecha_vigencia\": \"2024-01-01\", \"pdf_url\": \"https://www.ccoo-servicios.es/archivos/BOCM-20240406-Conv-hosteleria.pdf\"}"
```

### Otros convenios disponibles para indexar

```bash
# Ejemplo con otro PDF (cambiar datos segun convenio)
curl -X POST http://localhost:5678/webhook/ingesta-convenio -H "Content-Type: application/json" -d "{\"nombre\": \"NOMBRE_DEL_CONVENIO\", \"codigo_regcon\": \"CODIGO_REGCON\", \"ambito\": \"provincial|estatal|empresa\", \"fecha_vigencia\": \"YYYY-MM-DD\", \"pdf_url\": \"URL_DEL_PDF\"}"
```

## Paso 4: Verificar Indexacion

Esperar a que n8n termine (monitorear en http://localhost:5678) y luego Claude Code verifica:

```bash
# Verificar convenio creado
curl -s "http://127.0.0.1:54321/rest/v1/convenios?select=id,nombre,estado" -H "apikey: sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"

# Contar chunks indexados
curl -s "http://127.0.0.1:54321/rest/v1/convenio_chunks?select=id" -H "apikey: sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH" -H "Prefer: count=exact" -H "Range: 0-0" -I 2>/dev/null | findstr "Content-Range"
```

**Resultado esperado:** ~160-180 chunks con embeddings.

---

## Notas para Claude Code

Cuando el usuario pida "reset y re-indexar":

1. **Paso 1 y 2**: Indicar al usuario que ejecute los SQL manualmente en Supabase Studio
2. **Paso 3**: Ejecutar el curl del indexer (Claude Code puede ejecutar esto directamente)
3. **Paso 4**: Esperar confirmacion del usuario de que n8n termino, y verificar con los curls

El proceso de indexacion tarda varios minutos (descarga PDF, LlamaParse, embeddings OpenAI).

## Troubleshooting

### Error "Could not find function search_semantic_cache"

Si aparece este error, el usuario debe ejecutar en Supabase Studio:

```sql
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
```

### Error en "HTTP Supabase storage PDF"

Falta crear el bucket de storage. Ver Paso 2.

### El chat no encuentra informacion que existe en los chunks

El threshold de busqueda semantica puede ser muy alto. Verificar que `DEFAULT_CHUNK_THRESHOLD` en `supabase/functions/_shared/core/chat/ask-question.ts` sea 0.5 (no 0.7).
