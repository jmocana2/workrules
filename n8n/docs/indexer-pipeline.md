# Pipeline de Indexación RAG - Workrules Indexer

## Descripción General

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
┌─────────┐   ┌──────────────┐  │ Check LlamaParse │   ┌───────────────────┐
│ Webhook │──►│ HTTP PDF     │──┤     Status        ├──►│ Is Processing     │
│  POST   │   │ Request      │  └──────────────────┘   │ Complete?         │
└─────────┘   └──────┬───────┘                          └─────┬───────┬────┘
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

### Fase 1: Recepción y descarga

| Nodo | Tipo | Funcion |
|---|---|---|
| **Webhook** | Webhook (POST) | Recibe el payload con datos del convenio (`nombre`, `codigo_regcon`, `pdf_url`, etc.) |
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

### Fase 3: Limpieza y almacenamiento del markdown

| Nodo | Tipo | Funcion |
|---|---|---|
| **Extract and clean md** | Code (JS) | Normaliza saltos de línea, limpia el markdown y estructura los datos |
| **Save md in supabase** | HTTP Request | Inserta el convenio en la tabla `convenios` con el markdown completo |

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

### Fase 6: Almacenamiento y respuesta

| Nodo | Tipo | Funcion |
|---|---|---|
| **Bulk Insert Chunks** | HTTP Request | Inserta todos los chunks con embeddings en la tabla `convenio_chunks` via API REST de Supabase |
| **Prepare Response** | Code (JS) | Construye el JSON de respuesta con estadisticas del procesamiento |
| **Respond to Webhook** | Respond to Webhook | Envia la respuesta HTTP al cliente |

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

La carpeta `n8n/nodes/` contiene copias de referencia (`ref_*.js`) del codigo JavaScript embebido en los nodos Code del workflow. Estos archivos facilitan la lectura del codigo fuera de n8n pero **no son ejecutados por el workflow** — el codigo real esta inline en el JSON.

## Tablas de Supabase utilizadas

| Tabla | Operacion | Nodo |
|---|---|---|
| `convenios` | INSERT | Save md in supabase |
| `convenio_chunks` | INSERT (bulk) | Bulk Insert Chunks |
| `pipeline_logs` | INSERT | Workrules-Errors > Save to Logs |
| Supabase Storage (`convenios-pdf`) | UPLOAD | HTTP Supabase storage PDF |
