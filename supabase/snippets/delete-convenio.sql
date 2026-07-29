-- =============================================================================
-- Borrar un convenio y toda su información relacionada
-- =============================================================================
-- Uso: reemplaza el UUID literal en TODAS las apariciones de la constante y
-- ejecuta el bloque completo desde el SQL Editor de Supabase (o psql).
--
-- Qué borra:
--   - Filas dependientes con ON DELETE CASCADE (automático al hacer DELETE
--     sobre `convenios`):
--       · convenio_chunks       (embeddings + texto por artículo)
--       · convenio_perfiles     (variables críticas, tabla salarial)
--       · convenio_versiones    (historial BOE Watchdog)
--       · semantic_cache        (respuestas cacheadas para este convenio)
--   - Filas con ON DELETE SET NULL (se conservan, pero pierden la referencia):
--       · chat_sessions.convenio_id -> NULL  (los mensajes históricos siguen
--         accesibles al usuario, pero sin convenio asociado)
--   - Filas sin ON DELETE definido (habría bloqueado el DELETE), se ponen a
--     NULL de forma explícita antes de borrar:
--       · user_documents.convenio_id -> NULL  (el PDF privado del usuario se
--         conserva; solo se desasocia del convenio público)
--
-- Lo que NO borra (Supabase bloquea el DELETE directo sobre `storage.objects`
-- vía `storage.protect_delete`, hay que usar la Storage API):
--   - El PDF en el bucket `convenios-pdf`. El paso 1 imprime el path
--     (`url_pdf`); bórralo manualmente desde el dashboard de Storage o con:
--       supabase storage rm "sb://convenios-pdf/<path>"
--     o desde código:
--       supabaseAdmin.storage.from('convenios-pdf').remove([path])
--   - Datos de `auth.users`.
--
-- El bloque va dentro de una transacción: si algo falla, no se borra nada.
-- Si prefieres una prueba en seco, cambia COMMIT por ROLLBACK al final.
-- =============================================================================

-- >>> Reemplaza este UUID por el id del convenio a borrar <<<
--     (aparece 4 veces en este script)

BEGIN;

-- 1) Log de lo que vamos a borrar (útil para verificar antes de commitear).
SELECT
    c.id,
    c.nombre_corto,
    c.nombre_oficial,
    c.ambito_territorial,
    c.fecha_vigencia,
    c.url_pdf,
    (SELECT count(*) FROM convenio_chunks    WHERE convenio_id = c.id) AS chunks,
    (SELECT count(*) FROM convenio_perfiles  WHERE convenio_id = c.id) AS perfiles,
    (SELECT count(*) FROM convenio_versiones WHERE convenio_id = c.id) AS versiones,
    (SELECT count(*) FROM semantic_cache     WHERE convenio_id = c.id) AS cache_hits,
    (SELECT count(*) FROM chat_sessions      WHERE convenio_id = c.id) AS chat_sessions_desasociadas,
    (SELECT count(*) FROM user_documents     WHERE convenio_id = c.id) AS user_documents_desasociados
FROM convenios c
WHERE c.id = 'd79f4a22-9359-4651-bb86-8e299ec25378'::uuid;

-- 2) Desasociar `user_documents` (FK sin ON DELETE, bloquearía el borrado).
UPDATE user_documents
SET convenio_id = NULL
WHERE convenio_id = 'd79f4a22-9359-4651-bb86-8e299ec25378'::uuid;

-- 3) Borrar el convenio. Dispara los CASCADE sobre chunks, perfiles,
--    versiones y semantic_cache; y el SET NULL sobre chat_sessions.
DELETE FROM convenios
WHERE id = 'd79f4a22-9359-4651-bb86-8e299ec25378'::uuid;

-- 4) Confirmación: debe devolver 0 filas.
SELECT count(*) AS deberia_ser_cero
FROM convenios
WHERE id = 'd070454a-0a0f-487f-ab02-8c900234cdb1'::uuid;

COMMIT;
