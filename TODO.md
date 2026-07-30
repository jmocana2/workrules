# WorkRules - TODOs y Mejoras Futuras

## 📋 Backlog

### 2. Optimizar Timeout del Webhook n8n
**Archivo**: `supabase/functions/upload-convenio/index.ts:119-155`
**Estado**: Implementado (timeout 5s), mejorable
**Complejidad**: Baja

Actualmente el timeout es de 5 segundos. Considerar:
- Usar `fetch` sin esperar respuesta (fire-and-forget)
- O verificar solo que n8n recibió el request (200 OK en <1s)

---

### 3. Notificaciones Push para Convenios Listos
**Estado**: Pendiente
**Complejidad**: Media

Si el usuario cierra la pestaña mientras procesa, no sabrá cuándo termina. Opciones:
- Web Push Notifications
- Email notification cuando estado = "activo"
- Realtime subscriptions de Supabase

---

### 4. Sistema de Reintentos para Errores de n8n
**Estado**: Pendiente
**Complejidad**: Media

Si n8n falla (LlamaParse timeout, Claude API error, etc.):
- Detectar el error en el workflow
- Actualizar estado = "error" con mensaje descriptivo
- Permitir al usuario "Reintentar" desde el frontend
- Considerar reintentos automáticos con backoff exponencial

---

## 🐛 Bugs Conocidos

### Coste de indexación por convenio demasiado alto (~$0.5–1 por PDF grande)
**Fecha detectado**: 2026-07-30
**Contexto**: Al indexar `hosteleria-malaga-2018.pdf` el nodo `HTTP Claude API` (Sonnet 4.5) devolvió `stop_reason: "max_tokens"` con `output_tokens: 16384` y `input_tokens: 91538`, coste estimado **$0.52 en una sola llamada** (y truncada — hubo que subir `MAX_OUTPUT_TOKENS` a 64000 para que cierre el JSON, lo que sube el coste a ~$1 en convenios grandes).

**Causa raíz**: el prompt de `Prepare Claude Request` pide a Claude que emita en un único JSON:
- TODAS las categorías profesionales (≈160 en Hostelería Málaga)
- Salarios por 10 tipos de establecimiento **por cada categoría** (matriz 160×10)
- Sinónimos por categoría con variaciones de género
- `valores_posibles` con todas las categorías listadas otra vez
- Complementos, jornada, tablas, horas extra, periodo prueba, vacaciones…

Esto genera output masivo (30–40k tokens) con mucha redundancia (mismos salarios repetidos en cada categoría del mismo nivel).

**Posibles mitigaciones a evaluar**:
1. **Dividir la extracción en 2–3 llamadas** (categorías/salarios, complementos+jornada, valores_posibles). Reduciría output por llamada y permitiría cachear el system prompt entre ellas.
2. **Normalizar salarios por nivel en el JSON** en vez de repetirlos categoría a categoría. Ej: `salarios_por_nivel: { "I": {"5*":…}, "II":…}` y en cada categoría sólo `nivel`. Ahorro estimado 60–70% del output.
3. **Modelo más barato para la extracción estructurada** (Haiku 4.5 a $0.8/M input, $4/M output → ~5× más barato). Requiere validar que respeta el schema con la misma calidad.
4. **Prompt caching** del system prompt ya activo, pero el user prompt (con el markdown del convenio) no cachea. Evaluar si segmentar el markdown ayuda.

**Impacto**: con 100 convenios grandes indexados = $100. No sostenible para escalado.

---

---

## 🏗️ Ingeniería del software

### Deuda pendiente de arquitectura back (post refactor 007 + P1/P2)

Detalle y contexto en [`docs/arquitectura/arquitectura-software.md`](docs/arquitectura/arquitectura-software.md) §5.1.

- **Fase 8b refactor 007** — migrar use cases a firma completa `ChatCommand` y eliminar `data-classifier.checkInvalidVariables`. Requiere renovar fixtures a UUIDs válidos y mover extracción NL de `calculate-salary` al pipeline de VOs. Riesgo alto, sesión dedicada.
- **P3 — partir `lib/supabase.ts` (834 líneas)** en repos por agregado dentro de `infrastructure/supabase/`. Hoy los adapters son thin wrappers.
- **Consolidar puertos duplicados** entre `AskQuestionDeps` y `CalculateSalaryDeps` (10+ métodos repetidos).
- **P2 evolutivo — puertos en VOs**, no en primitivos. Eliminar el desempaquetado de `unpack-command.ts`.
- **Extraer decisiones de modelo/temperature** de `lib/anthropic.ts` a `application/config/`.
- **Eliminar import cruzado** `ask-question` ↔ `calculate-salary/variable-adapters.ts` (mover a `rag/` compartido o a dominio).
- **Errores de dominio propios** (`QuotaExceededError`, `ConvenioNotFoundError`) y traducción en adapters. Hoy `AnthropicError` / `RepositoryError` cruzan a los use cases.
- **`prompts.ts`** — separar `normalizePerfilContexto` (dominio) de `buildSystemPrompt` (infra LLM).
- **Domain events** — pospuesto hasta ≥2–3 eventos reales con múltiples consumidores.
- **`domain/errors` unificado** — pospuesto hasta detectar patrones repetidos.



### Refactors SRP pendientes del audit `docs/refactor/001-srp-audit.md`

Tras cerrar el doc [`006-useChatPage-srp.md`](docs/refactor/006-useChatPage-srp.md) (violación 🔴 #5 del audit), quedan pendientes las violaciones 🟡 #6 y #7:

- **`useChatStream.ts`** (~440 líneas reales) — extraer `StreamEventDispatcher` (parseo puro de los 4 tipos de evento SSE) y `ChatMessageAccumulator` (acumulación en memoria + citaciones). El hook se queda con `AbortController`, retries y estado React.
- **`lib/chat-api.ts`** (~460 líneas reales) — extraer `SSEParser` como clase independiente con tests propios y `ChatAuthClient` (token + headers Supabase). Hoy mezcla parseo SSE + auth + manejo JSON/streaming + construcción de headers.

Ambos comparten un mismo eje: **el parseo SSE está duplicado entre `chat-api.ts` (`parseSSELine` + `processSSEStream`) y el `useChatStream` que lo consume**. Un `SSEParser` común elimina la duplicación real.

### Análisis pendientes (más allá de SRP)

La skill actual `.agents/skills/single-responsibility/` sólo cubre SRP. Falta un pase por el proyecto con estos ejes:

- **DRY** — duplicaciones estructurales reales. Un ejemplo detectado durante 006: el branching `if (useMocks) { mockX() } else { realX() }` aparece en 8+ sitios de `useChatPage.ts`. Otro: parseo SSE duplicado entre `chat-api.ts` y `useChatStream.ts`.
- **KISS** — simplificaciones posibles. Ej: ¿realmente el modo mock necesita vivir en producción, o puede quedar restringido a Storybook y aligerar `useChatPage`?
- **YAGNI** — código para escenarios no confirmados. Auditar hooks, use cases y componentes en busca de props/estados que hoy no usa nadie.
- **Antipatrones** — God hooks, primitive obsession en payloads de eventos, shotgun surgery al añadir un nuevo estado del protocolo, etc.

**Acción sugerida:** valorar la creación de una nueva skill (`.agents/skills/software-engineering-hygiene/` o similar) que ejecute este análisis de forma sistemática, análoga a `single-responsibility/` pero cubriendo DRY / KISS / YAGNI / antipatrones. Definir su `SKILL.md` (test de aplicabilidad, criterios de detección, plantilla de doc de análisis) sería el entregable inicial.

---

## ✅ Completados

### ~~Sistema de Progreso Real para Upload de Convenios~~
**Fecha**: 2026-05 (TFM.6)
**Implementado**: Edge Function `supabase/functions/webhook-progress/` + tabla `convenio_processing_status` + nodos `Notify Progress *` en `n8n/Workrules-Indexer.json` + polling en `src/ui/hooks/useConvenioUpload.ts`.
**Stages emitidos**: `parsing` (20), `saving_markdown` (40), `chunking` (60), `profile` (80), `completed` (100). Contrato completo en `supabase/functions/webhook-progress/README.md`.

### ~~Fix: Race Condition en Actualización de Estado~~
**Fecha**: 2026-04-21
**Problema**: El estado cambiaba de "procesando" → "activo" → "procesando"
**Solución**: Mover actualización a "procesando" ANTES del webhook n8n
**Archivos**: `supabase/functions/upload-convenio/index.ts`

### ~~Fix: Estado "activo" Prematuro~~
**Fecha**: 2026-04-21
**Problema**: n8n actualizaba estado a "activo" a los 30s en lugar de al final
**Solución**: Eliminar actualización de estado del nodo "Save md in supabase1"
**Archivos**: `n8n/Workrules-Indexer.json` (nodo "Save md in supabase1")

---

**Última actualización**: 2026-05-23
