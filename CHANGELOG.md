# Changelog

Todos los cambios notables del proyecto WorkRules se documentan en este archivo.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versionado semántico cuando aplique. Hasta el primer release público, las versiones se nombran por fase del TFM.

---

## [Unreleased] — TFM.7 (en curso)

Fase de ajustes finales de producción.

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

**Última actualización**: 2026-05-23
