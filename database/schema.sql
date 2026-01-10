-- =============================================================================
-- WorkRules - Esquema de Base de Datos
-- =============================================================================
-- Descripción: Esquema SQL para el sistema de gestión de convenios colectivos
-- Versión: 1.0
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extensiones necesarias
-- -----------------------------------------------------------------------------

-- Extensión para vectores de embeddings (búsqueda semántica)
CREATE EXTENSION IF NOT EXISTS vector;

-- Extensión para generación de UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
    c.created_at,
    c.updated_at
FROM convenios c
LEFT JOIN convenio_chunks cc ON c.id = cc.convenio_id
LEFT JOIN convenio_perfiles cp ON c.id = cp.convenio_id
GROUP BY c.id;

COMMENT ON VIEW v_convenios_stats IS 'Vista con estadísticas de convenios (chunks y perfiles asociados)';

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

-- =============================================================================
-- Fin del esquema
-- =============================================================================
