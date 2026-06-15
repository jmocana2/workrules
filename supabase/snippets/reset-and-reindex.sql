  -- Orden importante: hijos antes que padres (por FKs)
  TRUNCATE TABLE
    chat_messages,
    chat_sessions,
    semantic_cache,
    user_documents,
    convenio_chunks,
    convenio_perfiles,
    convenio_versiones,
    convenios
  RESTART IDENTITY CASCADE;
