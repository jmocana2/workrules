# Changelog

Todos los cambios notables del proyecto WorkRules se documentan en este archivo.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versionado semántico cuando aplique. Hasta el primer release público, las versiones se nombran por fase del TFM.

---

## [Unreleased]

---

## [0.11.0] — 2026-07-24

Refactor mayor de arquitectura del backend: separación clara de capas (Domain / Application / Infrastructure) con puertos hexagonales y Value Objects de dominio.

### Añadido
- **Capa de dominio** (`supabase/functions/_shared/domain/`):
  - `Result<T, E>` para manejo funcional de errores sin excepciones.
  - Value Objects como *branded types + smart constructors*: `ConvenioId`, `UserId`, `SessionId`, `HorasSemanales`, `HorasExtraAnuales`, `HorasNocturnas`, `AntiguedadAnos`, `ImporteEuros`, `SalarioBruto`, `Jornada`, `QueryIntent`, `DataState`.
  - Módulo `labor-law/` con `LEGAL_LIMITS` (Art. 34.1 / 35.2 ET) y `SMI_2026` extraídos del clasificador.
  - Anti-corruption layer `Perfil` / `VariableCritica` / `CategoriaProfesional` frente al JSON del indexer n8n.
  - Agregado de entrada `ChatCommand` + `input-mapper` (DTO HTTP → VO validado) con `InvalidChatInput` tipado.
- **Capa de aplicación con puertos hexagonales** (`supabase/functions/_shared/application/ports/`): interfaces neutrales `ChunkRepository`, `SemanticCacheStore`, `LlmChatClient`, `EmbeddingClient`, `QuotaService`, `ChatHistoryRepository`, `PerfilRepository`, `ConvenioRepository` con DTOs propios (`RetrievedChunk`, `ConvenioSummary`, `QuotaStatus`, `CacheHit`, `LlmChatRequest`).
- **Capa de infraestructura** (`supabase/functions/_shared/infrastructure/`) con adapters concretos por proveedor (`supabase/`, `anthropic/`, `openai/`) que implementan los puertos delegando en `lib/`.
- **Validación en el router** (`command-validator.ts`): `classifyAndExecute` invoca `toChatCommand` antes de cuota/cache/RAG y responde `invalid_data` con `reason` tipado (p. ej. `horasSemanales_below_minimum`, `not_uuid`, `completa_con_horas_bajas`, `horas_nocturnas_exceden_base_anual`).
- Red de seguridad `extracted-variables-validator.ts` para el path natural-language de `calculate-salary`.
- Skill de convenciones de estilo para frontend (`.claude/skills/frontend-coding-style/`).

### Cambiado
- **Reorganización de capas backend**: `_shared/core/chat/` → `_shared/application/chat/`. Los use cases (`ask-question`, `calculate-salary`) ahora reciben `ChatCommand` validado en lugar del `ChatRequest` crudo y dependen exclusivamente de puertos, no de tipos de infraestructura.
- Router pre-fetchea el `Perfil` e inyecta a los use cases (`perfil` reutilizado sin doble lectura).
- `unpackChatCommand` centraliza el desempaquetado de VOs a primitivos en un único punto (eliminado el `as unknown as string` disperso).
- `data-classifier.ts`: reducido de 402 a 251 líneas tras mover invariantes a VOs; `checkInvalidVariables` y `checkConflicts` retirados del flujo principal.
- `ImporteEuros`: redondeo bancario mejorado y heurística de parsing es-ES (`1.234` vs `12.34`).
- Validación de `pregunta` y `convenio_id` (longitud máxima) en el borde HTTP.
- Cálculo SMI enriquecido con contexto de contratos a tiempo parcial.

### Corregido
- `mapInvalid` incluye contexto y `reason` legible para el frontend.
- Límites de `horasSemanales` y `horasExtraAnuales` alineados con los límites de producto.

### Documentación
- Nuevo consolidado [`docs/arquitectura/arquitectura-software.md`](docs/arquitectura/arquitectura-software.md) con la arquitectura front + back post-refactor, regla de dependencias, catálogo de VOs y deuda técnica.
- Actualizado `docs/arquitectura/arquitectura-back.md` §4 con la nueva estructura de carpetas.
- Actualizado `CLAUDE.md` con la organización hexagonal (`domain/`, `application/ports/`, `infrastructure/`, `lib/`) y las excepciones de dependencia toleradas.
- Nuevo `docs/refactor/007-domain-value-objects.md` con el plan y estado por fases (0–8a completas, 8b/9 diferidas).
- Ampliado `TODO.md` con la deuda pendiente (fase 8b, partir `lib/supabase.ts`, consolidar puertos duplicados, errores de dominio, extraer config de modelo).
- Eliminados los md de análisis intermedios ya consolidados: `docs/domain-errors-events-clean-architecture.md`, `docs/arquitectura/clean-architecture-analysis.md`, `docs/arquitectura/use-cases-e-infraestructura-analysis.md`.

### Tests
- Suite Deno: **463 tests verdes** cubriendo VOs, mapeo `ChatCommand`, validación de router y adapters.

---

## [0.10.0] — 2026-07-17

Refactor mayor aplicando SRP y Clean Architecture al módulo de chat (frontend y edge functions).

### Cambiado
- **Frontend `ChatPage`**: extracción de hooks y helpers puros para reducir tamaño y responsabilidad del componente principal.
  - Nuevos sub-hooks: `useChatIntegration`, `useChatSessionLifecycle`, `useVariableChips`.
  - Nuevas columnas: `ChatSidebarColumn`, `ChatVariablesColumn`, `ChatConversationColumn`.
  - Helpers puros extraídos: mappers de variables, prompts, adaptadores de mensajes y `mapSpecialStateToUi`.
  - Extracción de `MessageCitations` y lógica de altura del input móvil a hooks propios.
- **Edge Function `/chat`**: aplicación de SRP a `handlers.ts` separando capas HTTP, SSE y routing en módulos independientes.
- **Casos de uso backend**: reorganización modular de `AskQuestion` y `CalculateSalary` con inyección de dependencias y adaptadores de variables.
- Módulos compartidos migrados de `ask-question/` a `rag/` para reutilización entre casos de uso.

### Añadido
- Manejo de eventos SSE y encoding para respuestas en streaming de Anthropic.
- Función `persistResponse` para cacheo y gestión de historial de chat.
- Expansión de chunks con vecinos para respuestas más completas.
- Reglas de chunks para display de artículos, mapeo de prompts y construcción de citaciones.
- Generación de cache keys y manejo de errores en `ask-question`.
- Tests de `calculate-salary` y JSDoc en el módulo de chat.

### Documentación
- Auditoría y revisión masiva de archivos `.md` del proyecto.
- Añadidos los 5 `.js` de referencia que faltaban en `n8n/nodes/indexer/` para los nodos de la Capa 2/3 (`Heuristic Score`, `Prepare Classifier Request`, `Parse Classification`, `Prepare Supabase Request`, `Determine Final Estado`).
- Renombrado `ref_prepare_claude_request_v2.js` → `ref_prepare_claude_request.js` para coherencia con el nombre del nodo.
- Eliminados 3 `.js` huérfanos en `n8n/nodes/indexer/` que no estaban referenciados por ningún nodo del workflow: `ref_generate_embeddings.js`, `ref_prepare_chunks_for_insert_updated.js`, `ref_prepare_response.js`.
- Sincronizado `n8n/nodes/errors/process_error.js` con el contenido vigente del workflow `Workrules-Errors.json` (mensajes de usuario más informativos, extracción de `convenio_id` para marcado en BD vía `Mark Convenio Error`).
- `n8n/docs/indexer-pipeline.md`: documentada la Capa 2/3 (heurística + clasificador Claude), la fase de extracción de Perfil JSON y los nodos `Notify Progress *`.
- Nuevo `supabase/functions/webhook-progress/README.md` con el contrato de stages emitidos por n8n.
- `docs/brief.md`: corregida la versión del modelo (Claude Sonnet 4, no 3.5).
- `docs/seguridad.md`: marcado el anti-ráfaga `/chat` como implementado y la aplicación del snippet SQL como acción de deploy.
- `TODO.md`: movido "Sistema de Progreso Real" a completados (ya implementado en TFM.6).

---

## [TFM.6] — 2026-05-22

### Añadido
- Anti-ráfaga en `/chat`: límite de 10 requests / 60s por usuario vía RPC `count_recent_chat_requests`, con respuesta `429` y fail-open ante errores de conteo. (`a5cb97e`)
- Tests E2E con Playwright para flujos de chat y variables de entorno asociadas. (`50d7415`)
- Función `getChunksByGroup` que expande el contexto del retrieval con artículos/secciones vecinos. (`ad96357`)
- Búsqueda en `ConvenioManager` y mejora de la lógica de display name. (`291dc05`)
- Enlaces a PDF en las citaciones del chat. (`ea0a925`)

### Cambiado
- Optimizaciones de Core Web Vitals: `React.lazy`, eliminación de componentes no usados, mejoras de bundle. (`babb618`)
- Pipeline de upload con tracking de progreso en tiempo real (sustituye la estimación logarítmica). (`cb82fa9`)
- Tiempo estimado de upload reducido a ~1 min tras mejoras del indexer. (`5a83ac3`)
- Sistema de citaciones reforzado en `ChatPage`. (`ada78dc`)

---

## [TFM.5] — 2026-04 a 2026-05

### Añadido
- Capa 2/3 de validación en el indexer: heurística + clasificador Claude para descartar PDFs que no son convenios colectivos. (`28e64b8`)
- Opción `autonomico` en el ámbito del convenio. (`8a9c962`)
- Campos adicionales en el modelo Convenio y mejoras de UI. (`3cffc0e`)
- Normalización de plan de usuario y mock `useUserPlan` en `ChatPage`. (`25af3a2`)
- Componente `UserMessage` y `Title`. (`f5dd808`)
- `ConvenioManager` para gestión administrativa de convenios. (`73b13f2`)
- Nodo `ref_respond_duplicate` en el indexer para responder rápido a PDFs duplicados. (`5476f94`)

### Corregido
- Inclusión de "possible values" obligatorios en la request a Claude para variables críticas. (`fe74012`)

---

## [TFM.4] — 2026-04

### Añadido
- Componente `MobileDrawer` y diseño responsivo del Sidebar y VariablesPanel. (`9c7fd0b`)
- `loadChatMessages` para recuperar mensajes históricos de la BD. (`b4419b3`)
- Gestión de tema con Zustand + `localStorage`. (`6667b8f`)
- Campos `url_pdf` y `pagina` en las citaciones. (`58b3426`)
- Hooks para sesiones de chat y gestión de convenios. (`040cde6`)

### Corregido
- Race condition en actualización de estado durante el upload (estado pasaba `procesando → activo → procesando`).
- Estado `activo` prematuro emitido por n8n a los 30s en lugar de al final.

---

## [TFM.3 y anteriores]

### Añadido
- Edge Function `upload-convenio` para usuarios premium, con validación y webhook a n8n. (`a19f075`)
- `ConvenioUploader` con barra de progreso y tiempo estimado. (`6c72a49`)
- Pipeline de indexación RAG en n8n (`Workrules-Indexer`) con LlamaParse + chunking + embeddings OpenAI + perfil Claude.
- Endpoint `/chat` con clasificador de queries (consulta general vs. cálculo salarial) y handlers correspondientes.
- Sistema de citaciones con referencias a artículos del convenio.

---

**Última actualización**: 2026-07-24
