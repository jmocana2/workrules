# Architecture Decision Records (ADR)

Este directorio contiene los **Architecture Decision Records** del proyecto WorkRules. Los ADRs documentan las decisiones arquitectónicas importantes junto con su contexto, alternativas consideradas y consecuencias.

---

## ¿Qué es un ADR?

Un ADR captura una decisión arquitectónica significativa junto con:

- **Contexto**: Por qué se necesitaba tomar esta decisión
- **Decisión**: Qué se decidió
- **Alternativas**: Qué otras opciones se consideraron
- **Consecuencias**: Qué implica esta decisión (positivo y negativo)

---

## Índice de ADRs

| ID | Título | Estado | Fecha |
|----|--------|--------|-------|
| [ADR-001](./001-n8n-rag-indexer.md) | n8n como RAG Indexer | Aceptado | Enero 2026 |
| [ADR-002](./002-deno-edge-functions-retriever.md) | Deno + Edge Functions como Retriever | Aceptado | Enero 2026 |
| [ADR-003](./003-supabase-plataforma.md) | Supabase como Plataforma BaaS | Aceptado | Enero 2026 |

---

## Estados posibles

| Estado | Significado |
|--------|-------------|
| **Propuesto** | En discusión, no implementado |
| **Aceptado** | Decisión tomada y en uso |
| **Deprecado** | Reemplazado por otra decisión |
| **Rechazado** | Considerado pero no adoptado |

---

## Cómo crear un nuevo ADR

1. Copiar la plantilla de abajo
2. Nombrar el archivo como `NNN-titulo-descriptivo.md`
3. Rellenar todas las secciones
4. Añadir al índice de este README

### Plantilla

```markdown
# ADR-NNN: Título de la Decisión

**Fecha:** [Mes Año]
**Estado:** [Propuesto | Aceptado | Deprecado | Rechazado]
**Decisores:** [Quién tomó la decisión]

---

## Contexto

[Descripción del problema o necesidad que requiere una decisión]

---

## Decisión

[Qué se ha decidido hacer]

---

## Alternativas Consideradas

### 1. [Alternativa A]

| Aspecto | Evaluación |
|---------|------------|
| **Pros** | ... |
| **Contras** | ... |
| **Descartado porque** | ... |

### 2. [Alternativa B]

...

---

## Consecuencias

### Positivas

- ...

### Negativas

- ...

---

## Referencias

- [Enlaces relevantes]
```

---

## Resumen de Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     WorkRules Architecture                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   SLOW PATH (Indexing)              FAST PATH (Retrieval)       │
│   ════════════════════              ═════════════════════       │
│                                                                  │
│   ┌─────────────┐                   ┌─────────────────────┐     │
│   │    n8n      │                   │   Edge Functions    │     │
│   │  (ADR-001)  │                   │     (ADR-002)       │     │
│   │             │                   │                     │     │
│   │  PDF → MD   │                   │  Query → Context    │     │
│   │  Chunking   │                   │  → Claude → Stream  │     │
│   │  Embeddings │                   │                     │     │
│   └──────┬──────┘                   └──────────┬──────────┘     │
│          │                                     │                 │
│          └──────────────┬──────────────────────┘                 │
│                         ▼                                        │
│          ┌─────────────────────────────┐                        │
│          │         Supabase            │                        │
│          │         (ADR-003)           │                        │
│          │                             │                        │
│          │  PostgreSQL + pgvector      │                        │
│          │  Auth + Storage + Edge Fn   │                        │
│          └─────────────────────────────┘                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Referencias

- [Michael Nygard - Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [ADR GitHub Organization](https://adr.github.io/)
