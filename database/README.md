# Base de Datos - WorkRules

## Descripción

Esquema de base de datos PostgreSQL para el sistema de gestión de convenios colectivos con capacidades de búsqueda semántica mediante embeddings.

## Estructura de Tablas

### 1. `convenios`
Tabla principal que almacena la información de los convenios colectivos.

**Campos principales:**
- `id`: Identificador único (UUID)
- `nombre`: Nombre del convenio (máx. 500 caracteres)
- `codigo_regcon`: Código único del Registro de Convenios
- `ambito`: Ámbito de aplicación (provincial, estatal, empresa, etc.)
- `fecha_vigencia`: Fecha de entrada en vigor
- `url_pdf`: URL del documento PDF original
- `version`: Versión del convenio
- `estado`: Estado actual (`activo`, `derogado`, `pendiente`, `archivado`)

### 2. `convenio_chunks`
Fragmentos de texto de los convenios con embeddings para búsqueda semántica (RAG).

**Campos principales:**
- `id`: Identificador único (UUID)
- `convenio_id`: Referencia al convenio padre
- `contenido`: Texto del fragmento
- `embedding`: Vector de embedding (dimensión 1536 para OpenAI text-embedding-3-small)
- `metadata`: Metadatos adicionales en formato JSON (sección, artículo, etc.)
- `chunk_index`: Índice secuencial del fragmento

**Nota:** Ajusta la dimensión del vector según el modelo de embeddings que uses:
- OpenAI text-embedding-3-small: 1536
- OpenAI text-embedding-3-large: 3072
- Otros modelos: consultar documentación

### 3. `convenio_perfiles`
Perfiles profesionales y categorías laborales extraídas de los convenios.

**Campos principales:**
- `id`: Identificador único (UUID)
- `convenio_id`: Referencia al convenio
- `perfil_data`: Datos estructurados del perfil en formato JSONB

**Ejemplo de estructura JSON para `perfil_data`:**
```json
{
  "categoria": "Oficial de Primera",
  "grupo": "Grupo II",
  "nivel": "3",
  "salario_base": 1800.50,
  "complementos": ["antiguedad", "nocturnidad"],
  "descripcion": "...",
  "requisitos": ["..."]
}
```

## Instalación

### Requisitos previos
- PostgreSQL 12 o superior
- Extensión pgvector instalada

### Instalación de pgvector

**En sistemas Unix/Linux:**
```bash
# Clonar repositorio
git clone https://github.com/pgvector/pgvector.git
cd pgvector

# Compilar e instalar
make
sudo make install
```

**En Docker:**
```bash
docker run -d \
  --name workrules-db \
  -e POSTGRES_PASSWORD=tu_password \
  -p 5432:5432 \
  ankane/pgvector
```

**En sistemas Windows:**
Consulta la [documentación oficial de pgvector](https://github.com/pgvector/pgvector#windows).

### Crear la base de datos

```bash
# Crear base de datos
createdb workrules

# Ejecutar el esquema
psql -d workrules -f schema.sql
```

O desde psql:
```sql
CREATE DATABASE workrules;
\c workrules
\i schema.sql
```

## Uso

### Insertar un convenio

```sql
INSERT INTO convenios (nombre, codigo_regcon, ambito, fecha_vigencia, url_pdf)
VALUES (
    'Convenio Colectivo del Sector Metal',
    'REG-2024-001',
    'Provincial - Madrid',
    '2024-01-01',
    'https://example.com/convenio.pdf'
);
```

### Insertar chunks con embeddings

```sql
-- Primero obtener el embedding desde tu aplicación (ej: usando OpenAI API)
-- Luego insertar:

INSERT INTO convenio_chunks (convenio_id, contenido, embedding, metadata, chunk_index)
VALUES (
    'uuid-del-convenio',
    'Artículo 15. Jornada laboral...',
    '[0.1, -0.2, 0.3, ...]'::vector,  -- Vector de 1536 dimensiones
    '{"articulo": "15", "seccion": "jornada"}'::jsonb,
    0
);
```

### Búsqueda semántica

Usa la función `search_similar_chunks` para encontrar fragmentos similares:

```sql
-- Buscar chunks similares a un embedding de consulta
SELECT * FROM search_similar_chunks(
    '[0.1, -0.2, 0.3, ...]'::vector,  -- embedding de la query
    0.7,  -- umbral de similitud (0-1)
    10    -- número máximo de resultados
);
```

### Consultar convenios con estadísticas

```sql
-- Ver convenios con conteo de chunks y perfiles
SELECT * FROM v_convenios_stats
WHERE estado = 'activo'
ORDER BY created_at DESC;
```

## Índices y Optimizaciones

El esquema incluye:

- **Índices B-tree**: Para búsquedas rápidas por código, estado, fecha y ámbito
- **Índices HNSW**: Para búsqueda vectorial eficiente (cosine similarity)
- **Índices GIN**: Para búsquedas en campos JSONB
- **Foreign Keys con CASCADE**: Eliminación automática de datos relacionados
- **Triggers**: Actualización automática de timestamps

## Funciones Auxiliares

### `search_similar_chunks(query_embedding, match_threshold, match_count)`

Busca chunks similares usando búsqueda vectorial.

**Parámetros:**
- `query_embedding`: Vector de embedding de la consulta
- `match_threshold`: Umbral mínimo de similitud (0-1, default: 0.7)
- `match_count`: Número máximo de resultados (default: 10)

**Retorna:** Tabla con chunk_id, convenio_id, contenido y similarity

## Vistas

### `v_convenios_stats`

Vista que muestra convenios con estadísticas agregadas:
- Total de chunks asociados
- Total de perfiles asociados
- Información básica del convenio

## Próximos Pasos

1. Implementar la lógica de procesamiento de PDFs
2. Configurar el sistema de generación de embeddings
3. Desarrollar la API de consultas
4. Implementar sistema de caché para búsquedas frecuentes

## Referencias

- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [PostgreSQL JSONB](https://www.postgresql.org/docs/current/datatype-json.html)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
