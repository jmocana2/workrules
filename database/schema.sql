-- =============================================================================
-- WorkRules - Esquema de Base de Datos
-- =============================================================================
-- Descripción: Esquema SQL para el sistema de gestión de convenios colectivos
-- Versión: 2.0
-- Última actualización: 2026-01-13
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extensiones necesarias
-- -----------------------------------------------------------------------------

-- Extensión para vectores de embeddings (búsqueda semántica)   
CREATE EXTENSION IF NOT EXISTS vector;

-- Extensión para generación de UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- SECCIÓN 1: GESTIÓN DE USUARIOS Y AUTENTICACIÓN
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabla: user_profiles
-- -----------------------------------------------------------------------------
-- Perfiles de usuario con información de suscripción y límites de uso
-- -----------------------------------------------------------------------------

CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_tier VARCHAR(20) DEFAULT 'free'
        CHECK (subscription_tier IN ('free', 'premium', 'enterprise')),
    monthly_queries_used INTEGER DEFAULT 0,
    monthly_query_limit INTEGER DEFAULT 5, -- Free: 5, Premium: ilimitado (-1), Enterprise: custom
    reset_date TIMESTAMP WITH TIME ZONE DEFAULT (DATE_TRUNC('month', CURRENT_TIMESTAMP) + INTERVAL '1 month'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para user_profiles
CREATE INDEX idx_user_profiles_subscription ON user_profiles(subscription_tier);
CREATE INDEX idx_user_profiles_reset_date ON user_profiles(reset_date);

-- Comentarios
COMMENT ON TABLE user_profiles IS 'Perfiles de usuario con información de suscripción y límites de consultas mensuales';
COMMENT ON COLUMN user_profiles.monthly_query_limit IS 'Límite de consultas: Free=5, Premium=-1 (ilimitado), Enterprise=custom';
COMMENT ON COLUMN user_profiles.reset_date IS 'Fecha de reinicio del contador mensual de consultas';

-- =============================================================================
-- SECCIÓN 2: CONVENIOS COLECTIVOS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabla: convenios
-- -----------------------------------------------------------------------------
-- Almacena la información principal de los convenios colectivos
-- -----------------------------------------------------------------------------

CREATE TABLE convenios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(500) NOT NULL,
    codigo_regcon VARCHAR(100) UNIQUE NOT NULL,
    ambito VARCHAR(200) NOT NULL,
    fecha_vigencia DATE NOT NULL,
    url_pdf TEXT,
    markdown_completo TEXT,
    version VARCHAR(50) DEFAULT '1.0',
    estado VARCHAR(50) DEFAULT 'activo' CHECK (estado IN ('activo', 'derogado', 'pendiente', 'archivado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para convenios
CREATE INDEX idx_convenios_codigo_regcon ON convenios(codigo_regcon);
CREATE INDEX idx_convenios_estado ON convenios(estado);
CREATE INDEX idx_convenios_fecha_vigencia ON convenios(fecha_vigencia);
CREATE INDEX idx_convenios_ambito ON convenios(ambito);

-- Comentarios
COMMENT ON TABLE convenios IS 'Tabla principal de convenios colectivos';
COMMENT ON COLUMN convenios.codigo_regcon IS 'Código único del Registro de Convenios';
COMMENT ON COLUMN convenios.ambito IS 'Ámbito de aplicación del convenio (provincial, estatal, empresa, etc.)';
COMMENT ON COLUMN convenios.markdown_completo IS 'Markdown completo del convenio parseado por LlamaParse';

-- -----------------------------------------------------------------------------
-- Tabla: convenio_chunks
-- -----------------------------------------------------------------------------
-- Almacena fragmentos de texto de los convenios con sus embeddings para RAG
-- -----------------------------------------------------------------------------

CREATE TABLE convenio_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    convenio_id UUID NOT NULL REFERENCES convenios(id) ON DELETE CASCADE,
    contenido TEXT NOT NULL,
    embedding vector(1536), -- Dimensión para OpenAI text-embedding-3-small (ajustar según modelo)
    metadata JSONB DEFAULT '{}',
    chunk_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraint para asegurar chunks únicos por convenio
    UNIQUE(convenio_id, chunk_index)
);

-- Índices para convenio_chunks
CREATE INDEX idx_chunks_convenio_id ON convenio_chunks(convenio_id);
CREATE INDEX idx_chunks_chunk_index ON convenio_chunks(convenio_id, chunk_index);

-- Índice HNSW para búsqueda vectorial eficiente (recomendado para embeddings)
-- Usar cosine distance para similitud semántica
CREATE INDEX idx_chunks_embedding ON convenio_chunks
    USING hnsw (embedding vector_cosine_ops);

-- Índice GIN para búsqueda en metadata JSONB
CREATE INDEX idx_chunks_metadata ON convenio_chunks USING GIN (metadata);

-- Comentarios
COMMENT ON TABLE convenio_chunks IS 'Fragmentos de texto de convenios con embeddings para búsqueda semántica (RAG)';
COMMENT ON COLUMN convenio_chunks.embedding IS 'Vector de embedding para búsqueda semántica';
COMMENT ON COLUMN convenio_chunks.metadata IS 'Metadatos adicionales del chunk (sección, artículo, etc.)';
COMMENT ON COLUMN convenio_chunks.chunk_index IS 'Índice secuencial del chunk dentro del convenio';

-- -----------------------------------------------------------------------------
-- Tabla: convenio_perfiles
-- -----------------------------------------------------------------------------
-- Almacena los perfiles profesionales extraídos de cada convenio
-- -----------------------------------------------------------------------------

CREATE TABLE convenio_perfiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    convenio_id UUID NOT NULL REFERENCES convenios(id) ON DELETE CASCADE,
    perfil_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para convenio_perfiles
CREATE INDEX idx_perfiles_convenio_id ON convenio_perfiles(convenio_id);

-- Índice GIN para búsqueda en perfil_data JSONB
CREATE INDEX idx_perfiles_data ON convenio_perfiles USING GIN (perfil_data);

-- Índice para búsquedas comunes en perfil_data (ejemplos - ajustar según estructura real)
CREATE INDEX idx_perfiles_categoria ON convenio_perfiles
    USING GIN ((perfil_data->'categoria'));

CREATE INDEX idx_perfiles_grupo ON convenio_perfiles
    USING GIN ((perfil_data->'grupo'));

-- Comentarios
COMMENT ON TABLE convenio_perfiles IS 'Perfiles profesionales y categorías extraídas de los convenios';
COMMENT ON COLUMN convenio_perfiles.perfil_data IS 'Datos estructurados del perfil en formato JSON (categoría, grupo, salario, etc.)';

-- -----------------------------------------------------------------------------
-- Tabla: convenio_versiones
-- -----------------------------------------------------------------------------
-- Almacena el historial de versiones de cada convenio (BOE Watchdog)
-- -----------------------------------------------------------------------------

CREATE TABLE convenio_versiones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    convenio_id UUID NOT NULL REFERENCES convenios(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    fecha_publicacion DATE NOT NULL,
    url_boe TEXT,
    cambios_principales TEXT,
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(convenio_id, version)
);

-- Índices para convenio_versiones
CREATE INDEX idx_versiones_convenio_id ON convenio_versiones(convenio_id);
CREATE INDEX idx_versiones_fecha ON convenio_versiones(fecha_publicacion DESC);
CREATE INDEX idx_versiones_current ON convenio_versiones(convenio_id, is_current) WHERE is_current = true;

-- Comentarios
COMMENT ON TABLE convenio_versiones IS 'Historial de versiones de convenios para tracking de actualizaciones del BOE';
COMMENT ON COLUMN convenio_versiones.is_current IS 'Indica si es la versión actualmente vigente del convenio';

-- =============================================================================
-- SECCIÓN 3: HISTORIAL DE CONVERSACIONES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabla: chat_sessions
-- -----------------------------------------------------------------------------
-- Sesiones de chat de usuarios con convenios
-- -----------------------------------------------------------------------------

CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    convenio_id UUID REFERENCES convenios(id) ON DELETE SET NULL,
    title VARCHAR(200), -- Título generado automáticamente del primer mensaje
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para chat_sessions
CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id, created_at DESC);
CREATE INDEX idx_chat_sessions_convenio ON chat_sessions(convenio_id);

-- Comentarios
COMMENT ON TABLE chat_sessions IS 'Sesiones de chat entre usuarios y el sistema de consulta de convenios';
COMMENT ON COLUMN chat_sessions.title IS 'Título generado automáticamente basado en el primer mensaje del usuario';

-- -----------------------------------------------------------------------------
-- Tabla: chat_messages
-- -----------------------------------------------------------------------------
-- Mensajes individuales dentro de cada sesión de chat
-- -----------------------------------------------------------------------------

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}', -- Parámetros extraídos, chunks usados, tokens, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para chat_messages
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, created_at);
CREATE INDEX idx_chat_messages_role ON chat_messages(session_id, role);
CREATE INDEX idx_chat_messages_metadata ON chat_messages USING GIN (metadata);

-- Comentarios
COMMENT ON TABLE chat_messages IS 'Mensajes individuales del chat con metadata de procesamiento';
COMMENT ON COLUMN chat_messages.metadata IS 'Información adicional: parámetros extraídos, chunks usados, tokens consumidos, etc.';

-- =============================================================================
-- SECCIÓN 4: OPTIMIZACIÓN Y CACHÉ
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabla: semantic_cache
-- -----------------------------------------------------------------------------
-- Caché semántico para reducir costes de API y mejorar latencia
-- -----------------------------------------------------------------------------

CREATE TABLE semantic_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query_embedding vector(1536) NOT NULL,
    query_text TEXT NOT NULL,
    response TEXT NOT NULL,
    convenio_id UUID REFERENCES convenios(id) ON DELETE CASCADE,
    hit_count INTEGER DEFAULT 1,
    tokens_saved INTEGER DEFAULT 0, -- Tracking de ahorro de costes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_hit_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
);

-- Índices para semantic_cache
CREATE INDEX idx_cache_embedding ON semantic_cache
    USING hnsw (query_embedding vector_cosine_ops);
CREATE INDEX idx_cache_convenio ON semantic_cache(convenio_id);
CREATE INDEX idx_cache_expires ON semantic_cache(expires_at);
CREATE INDEX idx_cache_hit_count ON semantic_cache(hit_count DESC);

-- Comentarios
COMMENT ON TABLE semantic_cache IS 'Caché semántico de consultas frecuentes para optimizar costes de API';
COMMENT ON COLUMN semantic_cache.tokens_saved IS 'Tracking acumulado de tokens ahorrados por hits en caché';
COMMENT ON COLUMN semantic_cache.expires_at IS 'Fecha de expiración del caché (renovable si recibe hits)';

-- =============================================================================
-- SECCIÓN 5: DOCUMENTOS PRIVADOS (Premium)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabla: user_documents
-- -----------------------------------------------------------------------------
-- PDFs privados subidos por usuarios Premium
-- -----------------------------------------------------------------------------

CREATE TABLE user_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL, -- Ruta en Supabase Storage
    original_filename VARCHAR(500) NOT NULL,
    convenio_id UUID REFERENCES convenios(id), -- NULL si es documento privado sin convenio asociado
    processing_status VARCHAR(50) DEFAULT 'pending'
        CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    file_size_bytes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Índices para user_documents
CREATE INDEX idx_user_documents_user ON user_documents(user_id, created_at DESC);
CREATE INDEX idx_user_documents_status ON user_documents(processing_status);
CREATE INDEX idx_user_documents_convenio ON user_documents(convenio_id);

-- Comentarios
COMMENT ON TABLE user_documents IS 'Documentos privados (PDFs) subidos por usuarios Premium';
COMMENT ON COLUMN user_documents.file_path IS 'Ruta completa en Supabase Storage (bucket + path)';
COMMENT ON COLUMN user_documents.processing_status IS 'Estado del procesamiento ETL del documento';

-- =============================================================================
-- SECCIÓN 6: TRIGGERS Y FUNCIONES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Triggers para actualizar updated_at
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_convenios_updated_at
    BEFORE UPDATE ON convenios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_perfiles_updated_at
    BEFORE UPDATE ON convenio_perfiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at
    BEFORE UPDATE ON chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Función para incrementar contador de consultas
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION increment_query_count(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_limit INTEGER;
    v_used INTEGER;
BEGIN
    -- Obtener límite y uso actual
    SELECT monthly_query_limit, monthly_queries_used
    INTO v_limit, v_used
    FROM user_profiles
    WHERE id = p_user_id;

    -- Si no existe el perfil, crearlo
    IF NOT FOUND THEN
        INSERT INTO user_profiles (id)
        VALUES (p_user_id);
        RETURN true;
    END IF;

    -- Premium ilimitado (-1)
    IF v_limit = -1 THEN
        UPDATE user_profiles
        SET monthly_queries_used = monthly_queries_used + 1
        WHERE id = p_user_id;
        RETURN true;
    END IF;

    -- Verificar si hay cuota disponible
    IF v_used >= v_limit THEN
        RETURN false;
    END IF;

    -- Incrementar contador
    UPDATE user_profiles
    SET monthly_queries_used = monthly_queries_used + 1
    WHERE id = p_user_id;

    RETURN true;
END;
$$;

COMMENT ON FUNCTION increment_query_count IS 'Incrementa el contador de consultas del usuario y verifica límites';

-- -----------------------------------------------------------------------------
-- Función para resetear contadores mensuales (llamar por cron)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION reset_monthly_query_counters()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_reset_count INTEGER;
BEGIN
    UPDATE user_profiles
    SET
        monthly_queries_used = 0,
        reset_date = DATE_TRUNC('month', CURRENT_TIMESTAMP) + INTERVAL '1 month'
    WHERE reset_date <= CURRENT_TIMESTAMP;

    GET DIAGNOSTICS v_reset_count = ROW_COUNT;
    RETURN v_reset_count;
END;
$$;

COMMENT ON FUNCTION reset_monthly_query_counters IS 'Resetea contadores mensuales de usuarios cuya fecha de reset ha llegado';

-- -----------------------------------------------------------------------------
-- Función para limpiar caché expirado
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM semantic_cache
    WHERE expires_at <= CURRENT_TIMESTAMP;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_expired_cache IS 'Elimina entradas de caché expiradas';

-- =============================================================================
-- SECCIÓN 7: ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Habilitar RLS en todas las tablas
-- -----------------------------------------------------------------------------

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE convenios ENABLE ROW LEVEL SECURITY;
ALTER TABLE convenio_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE convenio_perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE convenio_versiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE semantic_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Políticas: user_profiles
-- -----------------------------------------------------------------------------

-- Los usuarios solo pueden ver y editar su propio perfil
CREATE POLICY "Usuarios pueden ver su propio perfil"
    ON user_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Usuarios pueden actualizar su propio perfil"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = id);

-- Permitir inserción automática al registrarse
CREATE POLICY "Los usuarios pueden crear su propio perfil"
    ON user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- Políticas: convenios (públicos)
-- -----------------------------------------------------------------------------

-- Todos pueden leer convenios activos
CREATE POLICY "Convenios públicos legibles por todos"
    ON convenios FOR SELECT
    USING (estado = 'activo');

-- Solo admins pueden modificar (implementar con roles en el futuro)
-- CREATE POLICY "Solo admins pueden modificar convenios"
--     ON convenios FOR ALL
--     USING (auth.jwt() ->> 'role' = 'admin');

-- -----------------------------------------------------------------------------
-- Políticas: convenio_chunks y convenio_perfiles
-- -----------------------------------------------------------------------------

-- Lectura pública para chunks y perfiles de convenios activos
CREATE POLICY "Chunks públicos legibles"
    ON convenio_chunks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM convenios
            WHERE convenios.id = convenio_chunks.convenio_id
            AND convenios.estado = 'activo'
        )
    );

CREATE POLICY "Perfiles públicos legibles"
    ON convenio_perfiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM convenios
            WHERE convenios.id = convenio_perfiles.convenio_id
            AND convenios.estado = 'activo'
        )
    );

-- -----------------------------------------------------------------------------
-- Políticas: convenio_versiones
-- -----------------------------------------------------------------------------

-- Todos pueden leer versiones de convenios activos
CREATE POLICY "Versiones públicas legibles"
    ON convenio_versiones FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM convenios
            WHERE convenios.id = convenio_versiones.convenio_id
            AND convenios.estado = 'activo'
        )
    );

-- -----------------------------------------------------------------------------
-- Políticas: chat_sessions y chat_messages
-- -----------------------------------------------------------------------------

-- Los usuarios solo ven sus propias sesiones de chat
CREATE POLICY "Usuarios ven sus propios chats"
    ON chat_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden crear sus sesiones"
    ON chat_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden actualizar sus sesiones"
    ON chat_sessions FOR UPDATE
    USING (auth.uid() = user_id);

-- Los usuarios solo ven mensajes de sus sesiones
CREATE POLICY "Usuarios ven mensajes de sus sesiones"
    ON chat_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id
            AND chat_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Usuarios pueden crear mensajes en sus sesiones"
    ON chat_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id
            AND chat_sessions.user_id = auth.uid()
        )
    );

-- -----------------------------------------------------------------------------
-- Políticas: semantic_cache
-- -----------------------------------------------------------------------------

-- El caché es compartido entre todos (solo lectura para usuarios)
CREATE POLICY "Caché legible por todos los usuarios autenticados"
    ON semantic_cache FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Permitir escritura desde service_role (Edge Functions)
-- Nota: Las Edge Functions usan service_role que bypasea RLS automáticamente

-- -----------------------------------------------------------------------------
-- Políticas: user_documents
-- -----------------------------------------------------------------------------

-- Los usuarios solo ven sus propios documentos
CREATE POLICY "Usuarios ven sus propios documentos"
    ON user_documents FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden subir sus propios documentos"
    ON user_documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden actualizar sus propios documentos"
    ON user_documents FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden eliminar sus propios documentos"
    ON user_documents FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================================================
-- SECCIÓN 8: VISTAS Y UTILIDADES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Vistas útiles (opcional)
-- -----------------------------------------------------------------------------

-- Vista de convenios con conteo de chunks y perfiles
CREATE VIEW v_convenios_stats AS
SELECT
    c.id,
    c.nombre,
    c.codigo_regcon,
    c.ambito,
    c.estado,
    c.fecha_vigencia,
    COUNT(DISTINCT cc.id) as total_chunks,
    COUNT(DISTINCT cp.id) as total_perfiles,
    COUNT(DISTINCT cv.id) as total_versiones,
    c.created_at,
    c.updated_at
FROM convenios c
LEFT JOIN convenio_chunks cc ON c.id = cc.convenio_id
LEFT JOIN convenio_perfiles cp ON c.id = cp.convenio_id
LEFT JOIN convenio_versiones cv ON c.id = cv.convenio_id
GROUP BY c.id;

COMMENT ON VIEW v_convenios_stats IS 'Vista con estadísticas de convenios (chunks, perfiles y versiones asociadas)';

-- Vista de uso del sistema por usuario
CREATE VIEW v_user_usage_stats AS
SELECT
    up.id,
    up.subscription_tier,
    up.monthly_queries_used,
    up.monthly_query_limit,
    CASE
        WHEN up.monthly_query_limit = -1 THEN 0
        ELSE ROUND((up.monthly_queries_used::NUMERIC / NULLIF(up.monthly_query_limit, 0)) * 100, 2)
    END as usage_percentage,
    COUNT(DISTINCT cs.id) as total_sessions,
    COUNT(DISTINCT cm.id) as total_messages,
    COUNT(DISTINCT ud.id) as total_documents,
    up.created_at,
    up.updated_at
FROM user_profiles up
LEFT JOIN chat_sessions cs ON up.id = cs.user_id
LEFT JOIN chat_messages cm ON cs.id = cm.session_id
LEFT JOIN user_documents ud ON up.id = ud.user_id
GROUP BY up.id;

COMMENT ON VIEW v_user_usage_stats IS 'Vista con estadísticas de uso por usuario (consultas, sesiones, documentos)';

-- Vista de rendimiento del caché
CREATE VIEW v_cache_performance AS
SELECT
    DATE_TRUNC('day', created_at) as fecha,
    COUNT(*) as entradas_cache,
    SUM(hit_count) as total_hits,
    SUM(tokens_saved) as total_tokens_saved,
    AVG(hit_count) as avg_hits_per_entry,
    COUNT(*) FILTER (WHERE expires_at > CURRENT_TIMESTAMP) as entradas_activas,
    COUNT(*) FILTER (WHERE expires_at <= CURRENT_TIMESTAMP) as entradas_expiradas
FROM semantic_cache
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY fecha DESC;

COMMENT ON VIEW v_cache_performance IS 'Vista con métricas de rendimiento del caché semántico por día';

-- -----------------------------------------------------------------------------
-- Funciones auxiliares para búsqueda semántica
-- -----------------------------------------------------------------------------

-- Función para buscar chunks similares por embedding
CREATE OR REPLACE FUNCTION search_similar_chunks(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    chunk_id UUID,
    convenio_id UUID,
    contenido TEXT,
    similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cc.id as chunk_id,
        cc.convenio_id,
        cc.contenido,
        1 - (cc.embedding <=> query_embedding) as similarity
    FROM convenio_chunks cc
    WHERE 1 - (cc.embedding <=> query_embedding) > match_threshold
    ORDER BY cc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION search_similar_chunks IS 'Busca chunks similares usando búsqueda vectorial por cosine similarity';

-- -----------------------------------------------------------------------------
-- Función para buscar chunks similares FILTRADOS por convenio_id
-- -----------------------------------------------------------------------------
-- Nueva función para Fase 2: Permite filtrar búsqueda vectorial por convenio
-- específico, esencial para el RAG cuando el usuario pregunta sobre UN convenio
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION search_chunks_by_convenio(
    query_embedding vector(1536),
    p_convenio_id UUID,
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    chunk_id UUID,
    convenio_id UUID,
    contenido TEXT,
    metadata JSONB,
    similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cc.id as chunk_id,
        cc.convenio_id,
        cc.contenido,
        cc.metadata,
        1 - (cc.embedding <=> query_embedding) as similarity
    FROM convenio_chunks cc
    WHERE
        cc.convenio_id = p_convenio_id
        AND 1 - (cc.embedding <=> query_embedding) > match_threshold
    ORDER BY cc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION search_chunks_by_convenio IS 'Busca chunks similares de un convenio específico usando búsqueda vectorial (RAG Fase 2)';

-- Función para buscar en caché semántico
CREATE OR REPLACE FUNCTION search_semantic_cache(
    query_embedding vector(1536),
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
        1 - (sc.query_embedding <=> query_embedding) as similarity,
        sc.hit_count
    FROM semantic_cache sc
    WHERE
        sc.expires_at > CURRENT_TIMESTAMP
        AND 1 - (sc.query_embedding <=> query_embedding) > similarity_threshold
        AND (p_convenio_id IS NULL OR sc.convenio_id = p_convenio_id)
    ORDER BY sc.query_embedding <=> query_embedding
    LIMIT 1;
END;
$$;

COMMENT ON FUNCTION search_semantic_cache IS 'Busca en el caché semántico respuestas similares a la consulta actual';

-- =============================================================================
-- SECCIÓN 9: DATOS INICIALES Y CONFIGURACIÓN
-- =============================================================================

-- Nota: Los datos de ejemplo se insertarán después de crear el schema
-- Ver archivo seeds.sql para datos de prueba

-- =============================================================================
-- Fin del esquema
-- =============================================================================
--
-- NOTAS DE IMPLEMENTACIÓN:
--
-- 1. Ejecutar este script en una base de datos PostgreSQL con la extensión
--    pgvector ya instalada
--
-- 2. Configurar un cron job para ejecutar periódicamente:
--    - reset_monthly_query_counters() (diariamente)
--    - cleanup_expired_cache() (semanalmente)
--
-- 3. Las políticas RLS asumen que Supabase Auth está configurado
--    y que auth.uid() devuelve el UUID del usuario actual
--
-- 4. Para habilitar roles de admin, descomentar y adaptar las políticas
--    marcadas como "implementar con roles en el futuro"
--
-- 5. El caché semántico debe ser gestionado por Edge Functions usando
--    el service_role key, no directamente por usuarios
--
-- 6. Considerar añadir índices adicionales según patrones de uso real
--    después del análisis de queries en producción
--
-- =============================================================================
