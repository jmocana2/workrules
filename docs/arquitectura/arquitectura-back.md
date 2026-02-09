# Arquitectura en el Back

**Patron:** Serverless + Event-Driven Hybrid
**Enfoque:** Clean Architecture Pragmatica

---

## 1. Filosofia: Dos Caminos, Un Sistema

El backend separa los flujos por su **naturaleza temporal**:

| Flujo | Tipo | Latencia | Tecnologia |
|---|---|---|---|
| **Chat/Consultas** | Request-Response (Sincrono) | < 3 segundos | Edge Functions |
| **Ingesta/ETL** | Event-Driven (Asincrono) | 30s - 5 minutos | n8n |

---

## 2. Catalogo de Eventos

| Evento | Descripcion | Payload |
|---|---|---|
| `pdf.uploaded` | Usuario sube un PDF privado | `{ bucket, path, userId, fileName }` |
| `boe.convenio.detected` | Watchdog detecta convenio nuevo/actualizado en BOE | `{ codigoRegcon, url, fechaPublicacion }` |
| `convenio.processing.started` | n8n comienza a procesar un convenio | `{ convenioId, source }` |
| `convenio.processing.completed` | Convenio procesado y vectorizado correctamente | `{ convenioId, chunksCount, perfilId, version }` |
| `convenio.processing.failed` | Error durante el procesamiento | `{ convenioId, error, retryCount }` |

---

## 3. Pipeline de Ingesta (n8n) - OPERATIVO

El workflow `Workrules-Indexer` procesa convenios en dos ramas paralelas:

```
Webhook POST → Descarga PDF → LlamaParse → Markdown
                                               │
                              ┌────────────────┴────────────────┐
                              ▼                                 ▼
                    Rama Chunks                        Rama Perfil JSON
                    ├─ Chunking (~450 tokens)           ├─ Claude Sonnet 4
                    ├─ OpenAI Embeddings (1536d)        ├─ Validacion JSON
                    └─ Bulk Insert convenio_chunks       └─ Upsert convenio_perfiles
                              │                                 │
                              └────────────┬────────────────────┘
                                           ▼
                                    Merge + Response
```

**Archivos:** `n8n/Workrules-Indexer.json`, `n8n/Workrules-Errors.json`

---

## 4. Estructura de Carpetas (Clean Architecture Pragmatica)

```
supabase/
└── functions/
    ├── _shared/                        # Logica compartida entre Edge Functions
    │   ├── core/                       # Dominio + Aplicacion fusionados (por feature)
    │   │   ├── convenio/               # Tipos y logica de convenios
    │   │   │   └── types.ts            # Convenio, PerfilJSON, Chunk
    │   │   ├── chat/                   # Logica del chat RAG
    │   │   │   ├── ask-question.ts     # Use case: preguntas generales
    │   │   │   ├── calculate-salary.ts # Use case: calculos salariales
    │   │   │   ├── prompts.ts          # System prompts y templates
    │   │   │   └── types.ts            # ChatRequest, ChatResponse, SSE types
    │   │   └── salary/                 # Logica de validacion salarial
    │   │       ├── validators.ts       # SMI, limites legales, conflictos
    │   │       └── classifier.ts       # Clasificador de estado de datos
    │   └── lib/                        # Infraestructura (clients externos)
    │       ├── supabase.ts             # Cliente Supabase (queries, pgvector, cache)
    │       ├── anthropic.ts            # Cliente Anthropic (streaming SSE)
    │       └── openai.ts              # Cliente OpenAI (embeddings de preguntas)
    │
    ├── chat/                           # Edge Function: Chat RAG
    │   └── index.ts                    # POST /functions/v1/chat
    └── webhook-pdf/                    # Edge Function: Trigger para n8n (futuro)
        └── index.ts
```

### Decisiones de diseno

- **Por feature, no por capa:** `core/chat/` contiene tipos, use cases y prompts juntos. Mas facil de navegar que `domain/entities/`, `application/use-cases/` separados.
- **Sin clases, patron funcional:** Edge Functions en Deno son efimeras. Funciones exportadas son mas idiomaticas que clases con inyeccion de dependencias.
- **Un solo endpoint `/chat`:** Preguntas generales y calculos salariales comparten el mismo flujo RAG. La diferencia es el prompt y la validacion, no la arquitectura. El use case se selecciona internamente.
- **`webhook-pdf/` separado:** Para futuro trigger de ingesta desde el frontend (subida de PDFs privados). No se implementa en Fase 2.

---

## 5. Stack Tecnologico

| Categoria | Tecnologia | Funcion |
|---|---|---|
| **BaaS** | Supabase | DB, Auth, Storage, Edge Functions |
| **Base de Datos** | PostgreSQL + pgvector | Datos relacionales + busqueda semantica |
| **Compute** | Edge Functions (Deno) | API endpoints serverless |
| **Orquestador** | n8n (Hostinger) | Workflows ETL y eventos |
| **IA Razonamiento** | Claude Sonnet 4 (`claude-sonnet-4-20250514`) | Interpretacion, calculos y chat |
| **IA Extraccion** | Claude Sonnet 4 | Extraccion de Perfil JSON (en n8n) |
| **Embeddings** | OpenAI `text-embedding-3-small` (1536d) | Vectorizacion de texto |
| **Parsing** | LlamaParse | PDF → Markdown estructurado |

---

## 6. Estrategia de Base de Datos Vectorial

**Estado Actual: pgvector**

Usamos pgvector integrado en PostgreSQL/Supabase. Es suficiente para nuestra escala actual.

**Funciones de busqueda existentes:**
- `search_similar_chunks(embedding, threshold, count)` — busqueda global
- `search_chunks_by_convenio(embedding, convenio_id, threshold, count)` — busqueda filtrada por convenio (pendiente Fase 2)
- `search_semantic_cache(embedding, threshold, convenio_id)` — busqueda en cache

**Plan de Escalabilidad:**

| Escenario | Accion |
|---|---|
| < 500K vectores | pgvector con HNSW |
| 500K - 5M vectores | Evaluar migracion a Qdrant |
| > 5M vectores | Migrar a Qdrant Cloud |

---

## 7. Esquema de Base de Datos

**Una sola base de datos: PostgreSQL (Supabase)** cubre todas las necesidades:

| Funcion | Tecnologia | Que almacena |
|---|---|---|
| **Datos relacionales** | PostgreSQL | Usuarios, suscripciones, convenios, chats |
| **Perfiles JSON** | JSONB (convenio_perfiles) | Categorias, salarios, complementos extraidos por Claude |
| **Autenticacion** | Supabase Auth | Credenciales, sesiones (tablas `auth.*`) |
| **Busqueda vectorial** | pgvector (convenio_chunks) | Embeddings de chunks de convenios (1536d) |
| **Cache semantico** | pgvector (semantic_cache) | Respuestas cacheadas por similitud |
| **Archivos** | Supabase Storage | PDFs originales (bucket `convenios-pdf`) |

**Schema completo:** `database/schema.sql`

---

## 8. Mantenibilidad

| Beneficio | Descripcion |
|---|---|
| **Debugging aislado** | Chat falla → Edge Function. PDF no carga → n8n. |
| **Coste cero en reposo** | Sin usuarios ni eventos = $0 de compute |
| **Testabilidad** | `core/` testeable sin levantar Supabase ni gastar tokens |
| **Cambio de proveedor** | Cambiar Claude por GPT-4 solo afecta `lib/anthropic.ts` |
| **Simetria Front-Back** | Mismos types en ambos lados (futuro: package compartido) |
| **Cache integrado** | Semantic cache reduce costes de API y mejora latencia en consultas repetidas |

---

**Ultima actualizacion:** 2026-02-02
