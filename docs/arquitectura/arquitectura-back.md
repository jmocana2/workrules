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

## 4. Estructura de Carpetas (Clean Architecture Pragmatica + Hexagonal)

> Para el detalle completo de capas, puertos, VOs y regla de dependencias ver [`arquitectura-software.md`](./arquitectura-software.md).

```
supabase/functions/
├── chat/index.ts                       # Composition root del endpoint /chat
├── webhook-pdf/ · webhook-progress/ · upload-convenio/ · sign-pdf/
└── _shared/
    ├── domain/                         # Reglas puras: VOs, labor-law, perfil, chat-command, result
    ├── application/                    # Casos de uso + puertos hexagonales
    │   ├── ports/                      # Interfaces neutrales + DTOs (RetrievedChunk, QuotaStatus…)
    │   └── chat/                       # ask-question, calculate-salary, routing, http, sse, rag
    ├── infrastructure/                 # Adapters concretos que implementan puertos
    │   ├── supabase/                   # chunk, semantic-cache, quota, chat-history, perfil, convenio
    │   ├── anthropic/                  # llm-chat-client
    │   └── openai/                     # embedding-client
    └── lib/                            # SDK clients crudos + utilidades genericas (compartido con otras Edge Functions)
```

### Decisiones de diseno

- **Capas separadas (domain/application/infrastructure)** tras el refactor 007 + P1/P2. Regla de dependencia: `application` depende de `application/ports/`, nunca de `infrastructure/` ni `lib/`.
- **Sin clases, patron funcional:** VOs como *branded types + smart constructors*; puertos como interfaces TS; casos de uso como funciones con `Deps` inyectadas.
- **Un solo endpoint `/chat`:** Preguntas generales y calculos salariales comparten el mismo flujo RAG. El router (`use-case-router`) valida el `ChatCommand` y despacha segun `QueryIntent`.
- **`lib/` se conserva** como capa cruda porque la consumen las 6 Edge Functions distintas; los adapters de `infrastructure/` son thin wrappers sobre ella.

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
