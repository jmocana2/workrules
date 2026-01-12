# Arquitectura en el Back

**Patrón:** Serverless + Event-Driven Hybrid
**Enfoque:** Clean Architecture Pragmática

---

## 1. Filosofía: Dos Caminos, Un Sistema

El backend separa los flujos por su **naturaleza temporal**:

| Flujo | Tipo | Latencia | Tecnología |
|---|---|---|---|
| **Chat/Consultas** | Request-Response (Síncrono) | < 3 segundos | Edge Functions |
| **Ingesta/ETL** | Event-Driven (Asíncrono) | 30s - 5 minutos | n8n |

---

## 2. Catálogo de Eventos

| Evento | Descripción | Payload |
|---|---|---|
| `pdf.uploaded` | Usuario sube un PDF privado | `{ bucket, path, userId, fileName }` |
| `boe.convenio.detected` | Watchdog detecta convenio nuevo/actualizado en BOE | `{ codigoRegcon, url, fechaPublicacion }` |
| `convenio.processing.started` | n8n comienza a procesar un convenio | `{ convenioId, source }` |
| `convenio.processing.completed` | Convenio procesado y vectorizado correctamente | `{ convenioId, chunksCount, version }` |
| `convenio.processing.failed` | Error durante el procesamiento | `{ convenioId, error, retryCount }` |

---

## 6. Estructura de Carpetas (Clean Architecture Pragmática)

```javascript
supabase/
└── functions/
    ├── _shared/                    # Lógica compartida
    │   ├── core/                   # Dominio + Aplicación fusionados
    │   │   ├── convenio/
    │   │   ├── chat/
    │   │   └── salary/
    │   └── lib/                    # Infraestructura
    │       ├── supabase.ts
    │       ├── anthropic.ts
    │       └── openai.ts
    │
    ├── chat/                       # Edge Function: Chat RAG
    │   └── index.ts
    ├── ask-salary/                 # Edge Function: Cálculo salarial
    │   └── index.ts
    └── webhook-pdf/                # Edge Function: Trigger para n8n
        └── index.ts
```

---

## 8. Stack Tecnológico

| Categoría | Tecnología | Función |
|---|---|---|
| **BaaS** | Supabase | DB, Auth, Storage, Edge Functions |
| **Base de Datos** | PostgreSQL + pgvector | Datos relacionales + búsqueda semántica |
| **Compute** | Edge Functions (Deno) | API endpoints serverless |
| **Orquestador** | n8n (Docker) | Workflows ETL y eventos |
| **IA Razonamiento** | Claude 3.5 Sonnet | Interpretación y cálculos |
| **Embeddings** | text-embedding-3-small | Vectorización de texto |
| **Parsing** | LlamaParse | PDF → Markdown estructurado |

---

## 8.1 Estrategia de Base de Datos Vectorial

**Estado Actual: pgvector**

Usamos pgvector integrado en PostgreSQL/Supabase. Es suficiente para nuestra escala actual.

**Plan de Escalabilidad:**

| Escenario | Acción |
|---|---|
| < 500K vectores | pgvector con HNSW |
| 500K - 5M vectores | Evaluar migración a Qdrant |
| > 5M vectores | Migrar a Qdrant Cloud |

---

## 8.2 Esquema de Base de Datos

**Una sola base de datos: PostgreSQL (Supabase)** cubre todas las necesidades:

| Función | Tecnología | Qué almacena |
|---|---|---|
| **Datos relacionales** | PostgreSQL | Usuarios, suscripciones, convenios, chats |
| **Autenticación** | Supabase Auth | Credenciales, sesiones (tablas `auth.*`) |
| **Búsqueda vectorial** | pgvector | Embeddings de chunks de convenios |
| **Archivos** | Supabase Storage | PDFs originales (object storage) |

---

## 10. Mantenibilidad

| Beneficio | Descripción |
|---|---|
| **Debugging aislado** | Chat falla → Edge Function. PDF no carga → n8n. |
| **Coste cero en reposo** | Sin usuarios ni eventos = $0 de compute |
| **Testabilidad** | `core/` testeable sin levantar Supabase ni gastar tokens |
| **Cambio de proveedor** | Cambiar Claude por GPT-4 solo afecta `lib/anthropic.ts` |
| **Simetría Front-Back** | Mismos types en ambos lados (futuro: package compartido) |
