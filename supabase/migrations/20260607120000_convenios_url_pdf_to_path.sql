-- Convierte convenios.url_pdf de URL (signed o public) al path del objeto en Storage.
-- A partir de ahora, url_pdf contiene SIEMPRE el path "<uid>/<filename>.pdf",
-- y el frontend pide una signed URL fresca al edge function `sign-pdf` justo
-- antes de abrir el PDF. Esto evita el error "InvalidJWT: exp claim timestamp
-- check failed" que se daba al persistir signed URLs con TTL de 1h.

-- Storage URLs de Supabase tienen la forma:
--   .../storage/v1/object/sign/convenios-pdf/<path>?token=...
--   .../storage/v1/object/public/convenios-pdf/<path>
--   .../storage/v1/object/authenticated/convenios-pdf/<path>
-- Tras "/convenios-pdf/" viene el path; cortamos también cualquier query string.

UPDATE convenios
SET url_pdf = regexp_replace(
  split_part(url_pdf, '?', 1),
  '^.*/convenios-pdf/',
  ''
)
WHERE url_pdf LIKE 'http%/storage/v1/object/%/convenios-pdf/%';

COMMENT ON COLUMN convenios.url_pdf IS
  'Path del PDF en el bucket convenios-pdf (formato "<owner_uid>/<filename>.pdf"). El frontend obtiene signed URLs bajo demanda via /functions/v1/sign-pdf.';
