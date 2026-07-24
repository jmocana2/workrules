# Arquitectura de Software — WorkRules

**Fecha:** 2026-07-24
**Ámbito:** `src/` (frontend React) + `supabase/functions/` (backend Deno/Edge Functions)
**Enfoque:** Clean Architecture pragmática + hexagonal (puertos y adaptadores) en el backend; Clean Architecture ligera + Atomic Design en el frontend.

Este documento consolida el estado de la arquitectura tras los refactors:
- **007 — Value Objects de dominio** (fases 0–8a completas). Detalle en [`../refactor/007-domain-value-objects.md`](../refactor/007-domain-value-objects.md).
- **P1+P2 — Puertos hexagonales de aplicación** (interfaces neutrales `application/ports/` + adapters en `infrastructure/`).

Docs complementarios en la misma carpeta: [`arquitectura-back.md`](./arquitectura-back.md) (flujos e infra cloud del back), [`arquitectura-front.md`](./arquitectura-front.md) (atomic design + estado UI), [`arquitectura-cloud.md`](./arquitectura-cloud.md), [`arquitectura-seguridad.md`](./arquitectura-seguridad.md).

---

## 1. Principios rectores

1. **Dependencias apuntando hacia dentro.** Dominio no conoce aplicación; aplicación no conoce infraestructura. Se cumple mediante interfaces (puertos) declaradas en la capa que las consume.
2. **TypeScript funcional, sin OOP heavy.** Value Objects como *branded types + smart constructors* que devuelven `Result<T, E>`; se evitan clases, herencia y DI containers.
3. **Estados inválidos imposibles de construir.** La validación ocurre en el borde de entrada (`ChatCommand`), no repartida por el pipeline.
4. **Errores como datos.** El dominio nunca lanza; devuelve `Result`. La infraestructura sí puede lanzar, pero el adapter traduce en la frontera.
5. **Pragmatismo sobre purismo.** Se adopta lo que da valor hoy (VOs, puertos neutrales); se difieren abstracciones sin dolor probado (entidades, event bus, DI container).

---

## 2. Backend (`supabase/functions/`)

### 2.1 Estructura de capas

```
supabase/functions/
├── chat/index.ts                       ← Composition root del endpoint /chat
├── webhook-pdf/                        ← Otras Edge Functions
├── webhook-progress/
├── upload-convenio/
├── sign-pdf/
└── _shared/
    ├── domain/                         ← Reglas de negocio puras
    │   ├── result.ts                   ← Result<T,E>, ok/err/map/chain
    │   ├── labor-law/                  ← LEGAL_LIMITS (ET) + SMI_2026
    │   ├── value-objects/              ← 11 VOs (ver §2.3)
    │   ├── perfil/                     ← Perfil, VariableCritica, CategoriaProfesional
    │   └── chat-command/               ← ChatCommand + input-mapper (DTO→VO)
    │
    ├── application/                    ← Casos de uso y puertos
    │   ├── ports/                      ← Interfaces neutrales + DTOs de puerto
    │   │   ├── chunk-repository.ts
    │   │   ├── semantic-cache.ts
    │   │   ├── llm-chat-client.ts
    │   │   ├── embedding-client.ts
    │   │   ├── quota-service.ts
    │   │   ├── chat-history-repository.ts
    │   │   ├── perfil-repository.ts
    │   │   ├── convenio-repository.ts
    │   │   └── dtos.ts                 ← RetrievedChunk, ConvenioSummary, QuotaStatus, CacheHit, LlmChatRequest
    │   └── chat/
    │       ├── ask-question/           ← Use case: pregunta general (RAG)
    │       ├── calculate-salary/       ← Use case: cálculo salarial
    │       ├── routing/                ← use-case-router + command-validator
    │       ├── http/                   ← Parseo request + auth
    │       ├── sse/                    ← Streaming SSE
    │       ├── rag/                    ← Lógica RAG compartida (chunk-rules, error-mapper)
    │       ├── handlers.ts             ← Punto de entrada del endpoint
    │       ├── data-classifier.ts      ← Estado datos (incomplete/invalid/conflicting/complete)
    │       ├── variable-extractor.ts   ← Extracción NL de variables laborales
    │       ├── prompts.ts              ← System prompts
    │       └── unpack-command.ts       ← Adapter ChatCommand → primitivos
    │
    ├── infrastructure/                 ← Adapters concretos (implementan puertos)
    │   ├── supabase/                   ← chunk, semantic-cache, quota, chat-history, perfil, convenio
    │   ├── anthropic/                  ← llm-chat-client
    │   └── openai/                     ← embedding-client
    │
    └── lib/                            ← SDK clients crudos + utilidades genéricas
        ├── supabase.ts                 ← Cliente Supabase + funciones repo legacy (compartido con otras Edge Functions)
        ├── anthropic.ts                ← Cliente Anthropic SDK
        ├── openai.ts                   ← Cliente OpenAI
        └── cors.ts
```

### 2.2 Regla de dependencias

```
domain/  ←────  application/  ←────  infrastructure/  ←────  chat/index.ts (composition root)
                     │
                     └── application/ports/  (interfaces + DTOs neutrales)
```

- `domain/` no importa nada fuera de sí mismo (ni Deno stdlib con side effects).
- `application/` importa `domain/` y `application/ports/`. **No importa `infrastructure/` ni `lib/`.**
  - Excepciones vivas anotadas: `application/chat/rag/error-mapper.ts` usa clases de error concretas de infra; `application/chat/http/auth.ts` usa `verifyUserToken` de `lib/`. Ambas están documentadas y son deuda tolerada.
- `infrastructure/` implementa las interfaces de `application/ports/` delegando en `lib/`.
- La Edge Function (`chat/index.ts`) es el **composition root**: instancia adapters y los inyecta al use case vía `defaultDeps`.

### 2.3 Capa de dominio

**Value Objects (branded types + smart constructors):**

| Categoría | VOs |
|---|---|
| Identificadores | `ConvenioId`, `UserId`, `SessionId` (UUID v4) |
| Magnitudes laborales | `HorasSemanales` (1–40, pasos 0.5), `HorasExtraAnuales` (0–80), `HorasNocturnas`, `AntiguedadAnos` (0–50, pasos 0.5) |
| Retribución | `ImporteEuros` (2 decimales, redondeo bancario), `SalarioBruto` |
| Compuestos | `Jornada` (tipo + horas, invariante `completa ⇒ horas ≥ 35`) |
| Semánticos | `QueryIntent` (informativa vs salarial), `DataState` (state machine con precedencia `invalid > conflicting > incomplete > complete`) |
| Anti-corruption | `Perfil`, `VariableCritica`, `CategoriaProfesional` — invariantes contra el JSON del indexer n8n |
| Agregado de entrada | `ChatCommand` (input validado del use case) + `InvalidChatInput` (discriminated union) |

**Política legal (`domain/labor-law/`):** `LEGAL_LIMITS` (Art. 34.1 ET, Art. 35.2 ET…) y `SMI_2026`. Vive en dominio porque es derecho positivo español, reutilizable fuera del chat.

**Convenciones:**
- Constructor devuelve `Result<VO, VOError>`, nunca lanza.
- Errores como *tagged union* (`kind`), no strings.
- Test por VO con la tabla de casos límite (mínimo, máximo, fronteras, `NaN`, `Infinity`, negativo, no numérico).

### 2.4 Capa de aplicación

**Casos de uso** (`application/chat/{ask-question,calculate-salary}/`):
- Reciben `AskQuestionInput` / `CalculateSalaryInput` con `{ command: ChatCommand, perfil, preguntaOverride? }` — DTO validado, no request HTTP crudo.
- Devuelven *tagged unions* de salida (`type: "success" | "cache_hit" | "quota_exceeded" | "not_found" | "stream" | "error" | …`). El `result-mapper.ts` los proyecta a HTTP.
- Dependen sólo de puertos (`AskQuestionDeps` compone `quota`, `embeddings`, `cache`, `convenio`, `chunks`, `perfil`, `llm`, `history`).
- Testeables sin infra: los tests inyectan mocks de los puertos.

**Router** (`application/chat/routing/use-case-router.ts`):
1. Valida el request con `toChatCommand(req, perfil)` → devuelve `invalid_data` tipado si falla (antes de tocar cuota / cache / RAG).
2. Pre-fetch de `Perfil` para poder validar cross-field.
3. Despacha al use case según `QueryIntent`.

**Puertos** (`application/ports/`): interfaces TS declaradas dentro de la capa que las consume. Todos los DTOs son *neutrales* (camelCase, sin campos DB, sin tipos de Anthropic ni Supabase).

### 2.5 Capa de infraestructura

**Adapters** en `infrastructure/{supabase,anthropic,openai}/`:
- Cada uno implementa un puerto (`ChunkRepository`, `LlmChatClient`, `EmbeddingClient`…).
- Hoy son **thin wrappers**: delegan en las funciones existentes de `lib/*.ts` y mapean tipos DB (snake_case) → DTOs de puerto (camelCase).
- Migración interna de `lib/supabase.ts` (834 líneas) a repos por agregado queda como deuda futura (ver §5 y TODO).

**`lib/`:** consumida por adapters y por las **otras 5 Edge Functions** (`webhook-pdf`, `webhook-progress`, `upload-convenio`, `sign-pdf`). No se renombra por ese motivo.

### 2.6 Flujo del endpoint `/chat`

```
POST /chat
  │
  ▼
chat/index.ts (composition root)                  ── inyecta defaultDeps
  │
  ▼
handlers.ts → parseRequest (http/) → verifyAuth
  │
  ▼
use-case-router.classifyAndExecute
  │  1. toChatCommand(req, perfil?) → Result<ChatCommand, InvalidChatInput>
  │     ↳ si err → command-validator → CalculateSalaryInvalid tipado → HTTP 400
  │  2. pre-fetch Perfil vía deps.perfil
  │  3. clasificar QueryIntent
  │  4. dispatch → askQuestion | calculateSalary
  │
  ▼
Use case (ask-question o calculate-salary)
  ├─ deps.quota.check              (QuotaService)
  ├─ deps.embeddings.embed         (EmbeddingClient)
  ├─ deps.cache.lookup             (SemanticCacheStore)
  ├─ deps.convenio.getById         (ConvenioRepository)
  ├─ deps.chunks.searchByConvenio  (ChunkRepository)  ← RAG
  ├─ deps.llm.chat / stream        (LlmChatClient)    ← Anthropic
  └─ deps.history.append           (ChatHistoryRepository)
  │
  ▼
result-mapper → JSON | SSE stream → HTTP
```

---

## 3. Frontend (`src/`)

### 3.1 Filosofía

El frontend consume un backend que ya modela el dominio. **No se duplican reglas de negocio en el front.** Toda la lógica de "¿este dato es válido? ¿supera el SMI?" vive en el backend. El frontend sólo tiene lógica de presentación y coordinación de UI.

### 3.2 Estructura de carpetas

```
src/
├── core/                      # Lógica agnóstica a React
│   ├── types/                 # Tipos espejo del contrato backend
│   ├── hooks/                 # Hooks de aplicación (queries, mutations)
│   └── stores/                # Zustand (themeStore, sesión, UI)
│
├── ui/                        # Todo lo visual
│   ├── components/
│   │   ├── shadcn/            # Base Radix + shadcn/ui
│   │   ├── ai-elements/       # Chat AI (prompts, citations, reasoning)
│   │   └── workrules/         # Componentes propios (Atomic Design)
│   │       ├── atoms/
│   │       ├── molecules/
│   │       ├── organisms/
│   │       └── pages/
│   ├── hooks/                 # Hooks acoplados a UI (useChatStream…)
│   └── layouts/
│
├── lib/                       # Infraestructura compartida
│   ├── supabase.ts            # Cliente Supabase singleton
│   ├── api.ts                 # Fetch base + auth
│   ├── chat-api.ts            # Chat + SSE parsing
│   ├── format.ts              # Helpers puros de formateo
│   └── utils.ts
│
└── App.tsx
```

### 3.3 Capas y responsabilidades

| Capa | Ubicación | Contenido |
|---|---|---|
| **Dominio (mínimo)** | `src/core/types/`, `src/lib/format.ts` | Type aliases espejo del backend + formateadores puros |
| **Aplicación** | `src/core/hooks/`, `src/core/stores/`, `src/ui/hooks/useChatStream.ts` | Orquestación de estado + llamadas al backend |
| **Infraestructura/UI** | `src/lib/*.ts`, `src/ui/components/` | Fetch, SSE, Supabase client, componentes |

### 3.4 Atomic Design en `components/workrules/`

| Nivel | Descripción | Ejemplos |
|---|---|---|
| **Atoms** | Elementos indivisibles sin lógica de negocio | Logo, Badge, Chip, Icon |
| **Molecules** | Combinación de átomos con interacción simple | SearchInput, ConvenioCard, ChatBubble |
| **Organisms** | Secciones completas con lógica propia | ChatWindow, ConvenioSelector, Navbar |
| **Pages** | Composición de organisms + layout | HomePage, ChatPage, ConvenioPage |

### 3.5 Componentes del protocolo de interacción (Guardrails UI)

Cada estado del protocolo del backend (`DataState`, `InvalidChatInput`, `not_found`, `quota_exceeded`) tiene un componente de UI dedicado:

| Componente | Estado del protocolo | Descripción |
|---|---|---|
| `AlertSMI` | Resultado < SMI | Card amarilla con salario ajustado + Art. 27 ET |
| `AlertInvalidData` | Datos inválidos (`invalid`) | Card roja con explicación del límite y sugerencias |
| `AlertConflict` | Datos conflictivos (`conflicting`) | Dos opciones contradictorias para elegir |
| `ConvenioNotFound` | `not_found` | Alternativas (notificar, buscar similar, estatal) |
| `DataRequestForm` | Datos incompletos (`incomplete`) | Selects/chips desde el Perfil |
| `RangeDisplay` | "No lo sé" | Tabla con rango mín/máx |

### 3.6 Gestión de estado

- **TanStack Query** — server state (caché, revalidación, loading/error).
- **Zustand** — client state (modales, sidebar, sesión, preferencias).
- **Vercel AI SDK (`useChat`)** — estado del streaming de chat.

---

## 4. Testabilidad

| Nivel | Cómo |
|---|---|
| **VOs de dominio** | Deno test unitario sin dependencias (`deno test domain/`) |
| **Use cases** | Deno test con mocks de los puertos (`AskQuestionDeps` inyectado) |
| **Adapters** | Deno test contra Supabase local (opcional) o assertions sobre el mapeo de tipos |
| **Frontend** | Vitest para hooks/utilidades; Playwright para e2e (`pnpm test`) |
| **Storybook** | Componentes UI en aislamiento |

Estado actual: **463 tests deno verdes** tras el refactor 007.

---

## 5. Deuda técnica conocida

Ver también [`../../TODO.md`](../../TODO.md) sección "Ingeniería del software".

### 5.1 Backend

1. **Fase 8b del refactor 007** — la firma completa `ChatCommand` en use cases y la eliminación real de `data-classifier.checkInvalidVariables` están diferidas. Requiere renovar fixtures a UUIDs válidos y migrar el path natural-language de `calculate-salary`. Riesgo alto, sesión dedicada.
2. **`lib/supabase.ts` sigue siendo un god-module de 834 líneas.** P3 pendiente: partirlo en repos por agregado dentro de `infrastructure/supabase/`. Hoy los adapters son thin wrappers que delegan a estas funciones.
3. **Duplicación puertos entre use cases.** `AskQuestionDeps` y `CalculateSalaryDeps` comparten 10+ métodos. Falta consolidar en una interfaz común.
4. **Downcasting residual de VOs.** `unpack-command.ts` desempaqueta VOs a primitivos al inicio del use case; los puertos deberían aceptar VOs directamente (P2 evolución).
5. **`StreamOptions` con defaults en infra.** El modelo (`claude-sonnet-4-5`) y `temperature` viven en `lib/anthropic.ts`; es decisión de aplicación. Extraer a `application/config/`.
6. **Import cruzado entre use cases.** `ask-question` importa de `../calculate-salary/variable-adapters.ts`. Mover a `rag/` compartido o al dominio.
7. **Errores de infra cruzando a use cases.** `AnthropicError` y `RepositoryError` filtran a la capa de aplicación. Definir errores de dominio (`QuotaExceededError`, `ConvenioNotFoundError`) y traducir en el adapter.
8. **Domain events pospuestos.** Análisis en `docs/refactor/007-...` §fase-2 posible. Criterio: ≥ 2–3 eventos reales con múltiples consumidores. Aún no procede.
9. **`domain/errors` unificado pospuesto.** Hoy cada VO tiene su tagged union; se centralizará cuando haya patrones repetidos con suficiente masa crítica.

### 5.2 Frontend (heredado de audit SRP)

- `useChatStream.ts` (~440 líneas) — extraer `StreamEventDispatcher` + `ChatMessageAccumulator`.
- `lib/chat-api.ts` (~460 líneas) — extraer `SSEParser` + `ChatAuthClient`. Elimina duplicación de parseo SSE.
- Análisis DRY / KISS / YAGNI pendiente más allá de SRP.

---

## 6. Criterios de decisión (anti-sobreingeniería)

Antes de añadir una nueva división (nueva capa, nuevo tipo de puerto, nueva clase de error, evento de dominio), responder:

1. ¿Resuelve un problema real de hoy y no hipotético?
2. ¿Reduce complejidad cognitiva del equipo?
3. ¿Mejora mantenibilidad o testabilidad de forma visible?
4. ¿Tiene uso claro en este sprint o el siguiente?
5. Si no se hace ahora, ¿qué dolor concreto aparece?

Si 3 o más respuestas son "no", posponer.

---

## 7. Referencias

- Refactor VOs paso a paso: [`../refactor/007-domain-value-objects.md`](../refactor/007-domain-value-objects.md).
- Flujos back e ingesta n8n: [`arquitectura-back.md`](./arquitectura-back.md).
- Front Atomic Design y estado: [`arquitectura-front.md`](./arquitectura-front.md).
- Infraestructura cloud: [`arquitectura-cloud.md`](./arquitectura-cloud.md).
- Seguridad: [`arquitectura-seguridad.md`](./arquitectura-seguridad.md).
