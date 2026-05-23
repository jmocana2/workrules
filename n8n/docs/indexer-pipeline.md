# Pipeline de Indexación RAG - Workrules Indexer### Fase 1: Recepción y descarga### Fase 0: Verificación de Duplicados## Descripción General

El workflow **Workrules Indexer** es el pipeline ETL principal del sistema RAG. Recibe un convenio colectivo via webhook, lo procesa (descarga PDF, extrae texto, genera chunks y embeddings) y lo almacena en Supabase listo para busqueda semantica.

## Arquitectura del Pipeline

```
                                                        ┌─────────────────┐
                                                        │  HTTP LlamaParse │
                                                        │      PDF         │
                                                        └────────┬─────────┘
                                                                 │
                                                            ┌────▼────┐
                                                            │  Wait   │
                                                            │  (90s)  │
                                                            └────┬────┘
                                                                 │
                                                        ┌────────▼─────────┐
┌─────────┐   ┌─────────────┐   ┌──────────┐   ┌──────────────┐  │ Check LlamaParse │   ┌───────────────────┐
│ Webhook │──►│ Check       │──►│ Convenio │──►│ HTTP PDF     │──┤     Status        ├──►│ Is Processing     │
│  POST   │   │ Duplicate   │   │ Exists?  │   │ Request      │  └──────────────────┘   │ Complete?         │
└─────────┘   └─────────────┘   └────┬─────┘   └──────┬───────┘                          └─────┬───────┬────┘
                                     │ [EXISTE]       │
                                     ▼                │
                              ┌──────────────┐        │
                              │ Respond      │        │
                              │ Duplicate    │        │
                              │ (~200ms)     │        │
                              └──────────────┘        │
                     │                                     OK │       │ FAIL
                     │                                        ▼       ▼
              ┌──────▼──────────┐                   ┌─────────────┐ ┌──────────┐
              │ HTTP Supabase   │                   │ Get Markdown│ │ Stop and │
              │ storage PDF     │                   │ Result      │ │ Error    │
              └─────────────────┘                   └──────┬──────┘ └──────────┘
                                                          │
                                                   ┌──────▼──────────┐
                                                   │ Extract and     │
                                                   │ clean md        │
                                                   └──────┬──────────┘
                                                          │
                                                   ┌──────▼──────────┐
                                                   │ Save md in      │
                                                   │ supabase        │
                                                   └──────┬──────────┘
                                                          │
                          ┌───────────────────────────────┘
                          ▼
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐
  │ Chunk        │─►│ Prepare      │─►│ Prepare Batch│─►│ HTTP Request  │
  │ Markdown     │  │ Chunks for   │  │ for OpenAI   │  │ OpenAI        │
  │              │  │ Insert       │  │              │  │ Embeddings    │
  └──────────────┘  └──────────────┘  └──────────────┘  └───────┬───────┘
                                                                │
                                                         ┌──────▼───────┐
                                                         │ Merge        │
                                                         │ Embeddings   │
                                                         │ with Chunks  │
                                                         └──────┬───────┘
                                                                │
  ┌──────────────────┐  ┌──────────────┐  ┌─────────────────────▼──────┐
  │ Respond to       │◄─│ Prepare      │◄─│ Bulk Insert                │
  │ Webhook          │  │ Response     │  │ Chunks                     │
  └──────────────────┘  └──────────────┘  └────────────────────────────┘
```

## Fases del Pipeline

### Fase 0: Verificacion de Duplicados

| Nodo | Tipo | Funcion |
|---|---|---|
| **Webhook** | Webhook (POST) | Recibe el payload con datos del convenio (`nombre`, `codigo_regcon`, `pdf_url`, etc.) |
| **Check Duplicate Convenio** | HTTP Request | Consulta Supabase para verificar si ya existe un convenio con el mismo `codigo_regcon` |
| **Check Duplicate** | HTTP Request | Consulta la tabla `convenios` en Supabase para verificar si ya existe un registro con el mismo `codigo_regcon` |
Esta fase evita procesar PDFs duplicados, ahorrando:
- ~2-3 minutos de procesamiento
- Creditos de LlamaParse (~$0.003/pagina)
- Tokens de Claude y OpenAI
- Espacio en Storage

### Fase 1: Recepcion y descarga

| Nodo | Tipo | Funcion |
|---|---|---|
| **HTTP PDF Request** | HTTP Request | Descarga el PDF desde la URL proporcionada |

El PDF descargado se envia en paralelo a dos ramas:
- **Almacenamiento**: subida a Supabase Storage
- **Procesamiento**: extraccion de texto via LlamaParse

### Fase 2: Extraccion de texto (LlamaParse)

| Nodo | Tipo | Funcion |
|---|---|---|
| **HTTP LlamaParse PDF** | HTTP Request | Envia el PDF a la API de LlamaParse para parsing |
| **Wait** | Wait (90s) | Espera a que LlamaParse procese el documento |
| **Check LlamaParse Status** | HTTP Request | Consulta el estado del job |
| **Is Processing Complete?** | IF | Evalua si `status === "SUCCESS"` |
| **Get Markdown Result** | HTTP Request | Obtiene el markdown resultante |
| **Stop and Error** | Stop and Error | Detiene el workflow si LlamaParse falla |

### Fase 3: Limpieza, clasificación y almacenamiento del markdown

| Nodo | Tipo | Funcion |
|---|---|---|
| **Extract and clean md1** | Code (JS) | Normaliza saltos de línea, limpia el markdown y estructura los datos. Lee la respuesta de LlamaParse directo del nodo upstream (no usa `$input` porque `Notify Progress Parsing` se interpone) |
| **Heuristic Score** | Code (JS) | Capa 3 de validación: puntúa heurísticamente el markdown (presencia de tablas salariales, artículos, vocabulario laboral) para decidir si merece la pena llamar al clasificador Claude |
| **Prepare Classifier Request** | Code (JS) | Capa 2: construye el payload para Claude Classifier (verifica si el documento es realmente un convenio colectivo, no un anexo, BOE genérico o documento no relacionado) |
| **HTTP Claude Classifier** | HTTP Request | Llama al endpoint de Anthropic con el prompt del classifier |
| **Parse Classification** | Code (JS) | Parsea la respuesta del clasificador y normaliza el veredicto (`aceptado` / `rechazado` + motivo) |
| **Is Document Acceptable?** | IF | Bifurca: si es aceptable continúa el pipeline; si no, marca como rechazado |
| **Mark Rechazado** | HTTP Request | Actualiza `convenios.estado = 'rechazado'` con motivo y termina la rama |
| **Save md in supabase1** | HTTP Request | Inserta el convenio en la tabla `convenios` con el markdown completo |

### Fase 4: Chunking

| Nodo | Tipo | Funcion |
|---|---|---|
| **Chunk Markdown** | Code (JS) | Divide el markdown en fragmentos semanticos (~450 tokens, max 600). Preserva estructura de articulos/secciones. Detecta tablas salariales como chunks independientes |
| **Prepare Chunks for Insert** | Code (JS) | Agrupa los chunks individuales en un array unico con metadata |

Configuracion del chunking:
- **Target**: 450 tokens por chunk
- **Maximo**: 600 tokens
- **Minimo**: 100 tokens
- **Overlap**: 200 caracteres (~50 tokens)

Tipos de chunk detectados automaticamente: `normativa`, `tabla_salarial`, `tabla`, `definicion`, `procedimiento`, `jornada`, `sanciones`.

### Fase 5: Generación de embeddings

| Nodo | Tipo | Funcion |
|---|---|---|
| **Prepare Batch for OpenAI** | Code (JS) | Prepara el payload para la API de OpenAI (todos los textos en un solo batch) |
| **HTTP Request OpenAI Embeddings** | HTTP Request | Llama a `POST /v1/embeddings` con modelo `text-embedding-3-small` |
| **Merge Embeddings with Chunks** | Code (JS) | Combina cada chunk con su vector embedding (1536 dimensiones). Valida dimensiones y calcula estadisticas de uso |

### Fase 6: Almacenamiento, perfil y respuesta

| Nodo | Tipo | Funcion |
|---|---|---|
| **Bulk Insert Chunks** | HTTP Request | Inserta todos los chunks con embeddings en la tabla `convenio_chunks` via API REST de Supabase |
| **Chunks Branch Complete** | Code (JS) | Marca la rama de chunks como completa para sincronizar con la rama de perfil en `Wait Both Branches` |
| **Prepare Claude Request** | Code (JS) | Construye el prompt enriquecido (v2 - Perfil Enriquecido) para extraer el Perfil JSON del convenio con Claude Sonnet 4 |
| **HTTP Claude API** | HTTP Request | Llamada a Anthropic para extracción de perfil |
| **Extract Perfil Claude** | Code (JS) | Extrae el JSON del response de Claude |
| **Validate Perfil JSON** | Code (JS) | Valida estructura del Perfil JSON contra el esquema esperado |
| **Prepare Supabase Request** | Code (JS) | Construye el payload para upsert en `convenio_perfiles` |
| **HTTP Supabase Delete Perfil** / **Insert Perfil** | HTTP Request | Upsert manual (delete + insert) del perfil |
| **Upsert Perfil Supabase** | Code (JS) | Normaliza el resultado del upsert para la siguiente fase |
| **Wait Both Branches** | Merge | Sincroniza la rama de chunks con la rama de perfil antes del estado final |
| **Determine Final Estado** | Code (JS) | Decide el estado final del convenio (`activo` / `error_parcial`) según el resultado de ambas ramas |
| **Update Convenio Status** | Supabase | Actualiza `convenios.estado` con el valor calculado |

### Notificaciones de progreso (Notify Progress)

A lo largo del pipeline, varios nodos HTTP llaman a la Edge Function `webhook-progress` para reportar avance real al frontend (en lugar de la curva estimada anterior). Contrato y detalles en `supabase/functions/webhook-progress/README.md`.

| Nodo n8n | Posición en el pipeline | stage | progress |
|---|---|---|---|
| Notify Progress Parsing | tras Fase 2 (LlamaParse OK) | `parsing` | 20 |
| Notify Progress Markdown | tras Fase 3 (Save md) | `saving_markdown` | 40 |
| Notify Progress Chunks | tras Fase 4 (Bulk Insert) | `chunking` | 60 |
| Notify Progress Profile | tras Fase 6 (perfil upserteado o saltado) | `profile` | 80 |
| Notify Progress Completed | al final (estado final) | `completed` | 100 |

Estos nodos son `fire-and-forget`: si la Edge Function falla, el pipeline continúa.

## Payload del Webhook

```json
{
  "nombre": "Convenio Colectivo del Metal",
  "codigo_regcon": "28001234562026",
  "pdf_url": "https://example.com/convenio.pdf",
  "ambito": "Provincial - Madrid",
  "fecha_vigencia": "2026-01-01"
}
```

## Respuesta del Webhook

```json
{
  "status": "success",
  "message": "Convenio procesado correctamente con embeddings",
  "data": {
    "convenio_id": "uuid",
    "nombre": "Convenio Colectivo del Metal",
    "codigo_regcon": "28001234562026",
    "markdown_length": 45230,
    "chunks_generados": 87,
    "embeddings_generados": 87,
    "embedding_usage": {
      "total_tokens": 32150,
      "model": "text-embedding-3-small",
      "estimated_cost_usd": 0.000643
    }
  }
}
```

## Gestión de errores

El workflow tiene configurado **Workrules-Errors** como error workflow. Cuando un nodo falla:

1. Se activa el `Error Trigger` del workflow de errores
2. El nodo `Process Error` clasifica el error en tipos: `DUPLICATE_PDF`, `DUPLICATE_CONVENIO`, `LLAMAPARSE_TIMEOUT`, `AUTH_ERROR`, `PDF_NOT_FOUND`
3. Segun el tipo, decide si es reintentable (`should_retry`)
4. Registra el error en la tabla `pipeline_logs` de Supabase

## Credenciales necesarias

| Credencial | Tipo en n8n | Usada por |
|---|---|---|
| Supabase API | Supabase API | Storage PDF, Save md, Bulk Insert Chunks |
| LlamaParse | Header Auth (`Authorization: Bearer <key>`) | LlamaParse PDF, Check Status, Get Result |
| OpenAI API | OpenAI API | HTTP Request OpenAI Embeddings |

## Archivos de referencia

La carpeta `n8n/nodes/indexer/` contiene copias de referencia (`ref_*.js`) del codigo JavaScript embebido en los nodos Code del workflow. Estos archivos facilitan la lectura del codigo fuera de n8n pero **no son ejecutados por el workflow** — el codigo real esta inline en el JSON.

**Mapeo nodo → fichero:**

| Nodo del workflow | Fichero de referencia |
|---|---|
| Check Duplicate Convenio | `ref_check_duplicate_convenio.js` |
| Respond Duplicate | `ref_respond_duplicate.js` |
| Clear Retry Counter | `ref_clear_retry_counter.js` |
| Check Retry Limit | `ref_check_retry_limit.js` |
| Extract and clean md1 | `ref_extract_and_clean_md.js` |
| Heuristic Score | `ref_heuristic_score.js` |
| Prepare Classifier Request | `ref_prepare_classifier_request.js` |
| Parse Classification | `ref_parse_classification.js` |
| Chunk Markdown | `ref_chunk_markdown.js` |
| Prepare Chunks for Insert | `ref_prepare_chunks_for_insert.js` |
| Prepare Batch for OpenAI | `ref_prepare_batch_for_openai.js` |
| Merge Embeddings with Chunks | `ref_merge_embeddings_with_chunks.js` |
| Chunks Branch Complete | (inline, sin ref) |
| Prepare Claude Request | `ref_prepare_claude_request.js` |
| Extract Perfil Claude | `ref_extract_perfil_claude.js` |
| Validate Perfil JSON | `ref_validate_perfil_json.js` |
| Prepare Supabase Request | `ref_prepare_supabase_request.js` |
| Upsert Perfil Supabase | `ref_upsert_perfil_supabase.js` |
| Determine Final Estado | `ref_determine_final_estado.js` |

Para los nodos del workflow de errores (`Workrules-Errors.json`), los ficheros de referencia están en `n8n/nodes/errors/` (`prepare_retry.js`, `process_error.js`).

## Tablas de Supabase utilizadas

| Tabla | Operacion | Nodo |
|---|---|---|
| `convenios` | INSERT | Save md in supabase |
| `convenio_chunks` | INSERT (bulk) | Bulk Insert Chunks |
| `pipeline_logs` | INSERT | Workrules-Errors > Save to Logs |
| Supabase Storage (`convenios-pdf`) | UPLOAD | HTTP Supabase storage PDF |
