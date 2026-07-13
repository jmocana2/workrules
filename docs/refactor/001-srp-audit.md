# Auditoría SRP — WorkRules

**Fecha:** 2026-06-26
**Alcance:** `src/` (React 19) + `supabase/functions/` (Deno Edge Functions)
**Principio:** Single Responsibility Principle (SRP) — "una clase/módulo/función debe tener una única razón para cambiar".
**Enfoque:** pragmático. Solo violaciones con impacto funcional real (mantenibilidad, duplicación, testabilidad).

---

## Resumen ejecutivo

Se detectan **7 violaciones graves** concentradas en 2 zonas calientes:

1. **Backend `_shared/core/chat/`** — los 3 use cases (`handlers.ts`, `ask-question.ts`, `calculate-salary.ts`) suman ~1.977 líneas con ~65% de lógica RAG duplicada entre `ask-question` y `calculate-salary`.
2. **Frontend chat** — `ChatPage.tsx`, `useChatPage.ts`, `useChatStream.ts` y `chat-api.ts` mezclan UI, parsing SSE, estado, transporte HTTP y reglas de negocio.

Una sola extracción compartida (`RagOrchestrator` en backend + `SSEParser` en frontend) elimina ~600 líneas y desbloquea testing unitario aislado.

---

## Backend

### 🔴 1. `_shared/core/chat/ask-question.ts` (711 líneas)

**Responsabilidades conviviendo:**
- Búsqueda vectorial + embedding (`searchChunksByConvenio`, `embedQuestion`)
- Expansión de chunks vecinos (`expandChunksWithNeighbors`, `detectChunkGroups`)
- Construcción de prompts (`buildSystemPrompt`, `buildUserMessage`)
- Orquestación RAG end-to-end (~líneas 424–640)
- Cache semántica (`saveToSemanticCache`, `buildCacheKeyText`)
- Persistencia (`saveChatMessage`, `incrementQueryCount`)

**Síntoma:** 14 helpers internos + 1 use case principal. Imposible testear el flujo RAG sin tocar cache ni persistencia.

**Refactor sugerido:**
- `rag/retriever.ts` → búsqueda + embedding + expansión
- `rag/prompt-builder.ts` → system/user prompts
- `cache/semantic-cache.ts` → cache key + save/lookup
- `persistence/chat-log.ts` → saveChatMessage + incrementQueryCount

### 🔴 2. `_shared/core/chat/calculate-salary.ts` (649 líneas)

**Problema principal:** **duplicación masiva de `ask-question.ts`** (~65% del código de embedding, cache, historial y orquestación está copiado).

Responsabilidades únicas reales:
- Clasificación de estado de datos (`classifyDataState`)
- Extracción de variables (`extractVariables`, `variablesToRecord`)
- Mensajes de estados incompletos/conflictivos (`buildIncompleteMessage`, `buildConflictMessage`)

**Refactor sugerido:** extraer interfaz `RagOrchestrator` compartida con `ask-question`. Este archivo solo debería contener la lógica específica de salario.

### 🔴 3. `_shared/core/chat/handlers.ts` (617 líneas)

**Responsabilidades conviviendo:**
- Validación de request (`validateChatRequest`, `parseRequestBody`)
- Ruteo de use cases (`classifyAndExecute`, `transformRangesRequest`)
- Serialización HTTP (`mapResultToHttpResponse`, `buildMetadata`)
- Transformación de streams SSE (`handleStreamResponse`, `buildStatusStreamResponse`)

**Síntoma:** 7 funciones públicas + 4 interfaces. Cambiar el formato SSE obliga a tocar lógica de routing.

**Refactor sugerido:**
- `http/request-validator.ts`
- `http/sse-formatter.ts`
- `routing/use-case-router.ts`

---

## Frontend

### 🔴 4. `ChatPage.tsx` (~712 líneas)

**Responsabilidades conviviendo:**
- Render de 3 layouts (sidebar / chat / variables)
- Lógica responsive (3 breakpoints, ResizeObserver, 2 drawers)
- Parseo y render de citaciones (`MessageCitations`, líneas 94–157)
- Coordinación de estado global (convenio, messages, variables)
- 6+ event handlers (upload, PDF, etc.)

**Refactor sugerido:**
- Extraer `<ChatSidebarColumn>`, `<ChatCenterColumn>`, `<ChatVariablesColumn>` como componentes puros
- Mover lógica responsive a `useResponsiveLayout()`
- Mover `MessageCitations` a su propio archivo

### 🔴 5. `useChatPage.ts` (>400 líneas)

**Responsabilidades conviviendo:**
- Integración de 3 hooks heterogéneos (`useChatStream`, `useChat` AI SDK, `useChatSessions`)
- Mapeo backend → alertas UI (`handleSpecialState`, 7 casos)
- Transformación de formatos (`getMessageText`, `parseDataRequestEvent`)
- Gestión de chips/variables activas
- Gestión de sesión + persistencia de convenio

**Refactor sugerido:**
- `useChatIntegration()` → solo streaming + transformación SSE
- `useVariablePanel()` → chips + activeVariables
- `useChatSessions()` ampliado → sessionId + persistencia

### 🟡 6. `useChatStream.ts` (~440 líneas)

**Responsabilidades conviviendo:**
- Parseo de 4 tipos de evento SSE
- Gestión de AbortController + retries
- Acumulación de fragmentos en memoria
- Mapeo de estados especiales (incomplete, invalid, smi_alert, conflicting)

**Refactor sugerido:** extraer `StreamEventDispatcher` (parseo) y `ChatMessageAccumulator` (acumulación) como utilidades puras testeables.

### 🟡 7. `lib/chat-api.ts` (~460 líneas)

Mezcla parseo SSE + autenticación Supabase + manejo JSON/streaming + construcción de headers.

**Refactor sugerido:**
- Clase `SSEParser` independiente (con tests propios)
- `ChatAuthClient` (token + headers)

---

## Top 5 prioridades (orden recomendado)

| # | Archivo | Líneas | Acción clave | Esfuerzo |
|---|---------|--------|--------------|----------|
| 1 | `calculate-salary.ts` + `ask-question.ts` | 1.360 | Extraer `RagOrchestrator` compartido | Alto |
| 2 | `handlers.ts` | 617 | Separar validación / routing / SSE | Medio |
| 3 | `useChatPage.ts` | 400+ | Dividir en 3 hooks por responsabilidad | Alto |
| 4 | `ChatPage.tsx` | 712 | Extraer columnas + hook responsive | Medio |
| 5 | `useChatStream.ts` + `chat-api.ts` | 900 | Extraer `SSEParser` puro | Medio |

---

## Lo que NO es prioridad

- Componentes `shadcn/` y `ai-elements/` — son librería, no aplica SRP de dominio.
- Atoms/molecules de `workrules/` — bien acotados.
- `_shared/lib/openai.ts`, `anthropic.ts` — wrappers finos, una responsabilidad clara.

---

## Próximos pasos sugeridos

1. Crear ADR `004-rag-orchestrator-shared.md` documentando la decisión de extracción.
2. Empezar por #1 (RAG compartido): mayor ROI, elimina duplicación real.
3. Bloquear nuevos use cases en `core/chat/` hasta que exista el orchestrator común.
