# Informe de Tests Unitarios

Fecha del informe: 2026-08-10
Comandos:
- Frontend: `pnpm test:unit` (Vitest + jsdom, config `vitest.unit.config.ts`)
- Backend/Supabase: `pnpm test:deno` (Deno test runner)

## Resumen global

| Ámbito | Ficheros de test | Tests | Estado |
|---|---|---|---|
| Frontend (`src/`) | 28 (unit) + 1 (integración) | 391 | 391 passed |
| Backend (`supabase/functions/`) | 32 (unit) + 2 (integración) | 518 passed / 4 ignored | ok |

Nota: tanto Vitest como Deno agrupan unit + integración en una sola ejecución (el sufijo `.integration` es marcador documental, no filtro del runner). Los ficheros `*.integration.test.*` se detallan en `../integration/README.md`. Aquí se cuentan únicamente los unit por sección.

---

## Frontend (`src/`) — 28 ficheros unit, ~380 tests unit

### Cobertura (Vitest + v8)

| Métrica | Cobertura |
|---|---|
| Statements | **49.89%** (1177/2359) |
| Branches | **41.74%** (678/1624) |
| Functions | **44.88%** (303/675) |
| Lines | **51.80%** (1147/2214) |

### Inventario por área

#### Átomos (4)
- `ui/components/workrules/atoms/StarRating/StarRating.test.tsx` — 93% lines
- `ui/components/workrules/atoms/ThemeToggle/ThemeToggle.test.tsx`
- `ui/components/workrules/atoms/Logo/Logo.test.tsx`
- `ui/components/workrules/atoms/ConvenioChip/ConvenioChip.test.tsx` — 89%

#### Moléculas (5)
- `AlertConflict/AlertConflict.test.tsx`
- `AlertInvalidData/AlertInvalidData.test.tsx`
- `AlertSMI/AlertSMI.test.tsx`
- `ConvenioListItem/ConvenioListItem.test.tsx` — 100%
- `DataRequestCard/DataRequestCard.test.tsx` — 96%

#### Organismos (10)
- `ConvenioUploader/__tests__/ConvenioUploader.test.tsx`
- `ConvenioUploader/__tests__/ConvenioPreview.test.tsx`
- `ConvenioUploader/__tests__/UploadProgress.test.tsx`
- `ConvenioUploader/VisibilitySelector.test.tsx`
- `ConvenioUploader/DropZone.test.tsx`
- `ConvenioSelector/ConvenioSelector.test.tsx` — 86%
- `Sidebar/Sidebar.test.tsx` — 48% (bajo)
- `VariablesPanel/VariablesPanel.test.tsx` — 88%
- `ConvenioManager/ConvenioManager.test.tsx` — 60%
- `MobileDrawer/MobileDrawer.test.tsx`

#### Páginas (2)
- `pages/ChatPage/ChatPage.test.tsx`
- `pages/ChatPage/parseAlertEvent.test.ts` — 92%

#### Hooks (5)
- `ui/hooks/useChatStream.test.ts` — 84%
- `ui/hooks/useChatSessions.test.tsx`
- `ui/hooks/useConvenioUpload.test.tsx` — 63%
- `ui/hooks/useConvenioVariables.test.tsx`
- `ui/hooks/useConvenios.test.tsx`

#### Otros (2)
- `core/stores/themeStore.test.ts` — 87%
- `lib/chat-api.test.ts` — 18% (bajo, funciones críticas sin cubrir)

### Zonas con cobertura crítica baja (candidatas a añadir tests)

| Fichero | Lines |
|---|---|
| `infrastructure/repositories/*` (varios) | **~2-3%** |
| `lib/chat-api.ts` | **18%** |
| `ui/components/ai-elements/*` (message, prompt-input, sources) | 23-33% |
| `ui/components/shadcn/dialog`, `dropdown-menu`, `select` | 0% |
| `pages/ChatPage/hooks/*` (conversationLifecycle, protocolState) | 22-47% |
| `pages/ChatPage/helpers/messageAdapters`, `syntheticPrompt` | 0-8% |
| `pages/ChatPage/components/ConversationCitations` | 0% |
| `ui/hooks/useSupabase.ts` | 50% |

### Zonas potencialmente redundantes / a revisar
- `ConvenioUploader` tiene 6 ficheros de test (uploader + preview + progress + visibility + dropzone + utils). Verificar si el "wrapper" `ConvenioUploader.test.tsx` duplica escenarios cubiertos por los específicos.
- Los tests de shadcn puros (button, badge) están al 100% pero prácticamente son wrappers de Radix — mantener sólo si aportan lógica propia.

---

## Backend / Supabase (`supabase/functions/`) — 32 ficheros unit, 518 tests (unit + integración; 4 ignored)

### Cobertura

`pnpm test:coverage` genera reporte en `supabase/functions/coverage/`. No hay un porcentaje global capturado en este informe (Deno lcov requiere `deno coverage` posterior). Recomendado añadir un script `test:coverage:report` que imprima el resumen.

### Inventario por capa (hexagonal)

#### `_shared/domain/` — Value Objects y reglas puras (17 ficheros)
- `result.test.ts`
- `chat-command/input-mapper.test.ts`
- `perfil/categoria-profesional.test.ts`
- `perfil/perfil.test.ts`
- `perfil/variable-critica.test.ts`
- `value-objects/antiguedad-anos.test.ts`
- `value-objects/convenio-id.test.ts`
- `value-objects/data-state.test.ts`
- `value-objects/horas-extra-anuales.test.ts`
- `value-objects/horas-nocturnas.test.ts`
- `value-objects/horas-semanales.test.ts`
- `value-objects/importe-euros.test.ts`
- `value-objects/jornada.test.ts`
- `value-objects/query-intent.test.ts`
- `value-objects/salario-bruto.test.ts`
- `value-objects/session-id.test.ts`
- `value-objects/user-id.test.ts`

Cobertura funcional esperada: alta (VOs son puros y muy testables).

#### `_shared/application/chat/` — Use cases y routing (9)
- `ask-question/ask-question.test.ts`
- `calculate-salary/calculate-salary.test.ts`
- `calculate-salary/extracted-variables-validator.test.ts`
- `data-classifier.test.ts`
- `handlers.test.ts`
- `prompts.test.ts`
- `query-expander.test.ts`
- `routing/command-validator.test.ts`
- `variable-extractor.test.ts`

#### `_shared/lib/` — SDK clients (4 unit)
- `anthropic.test.ts`
- `openai.test.ts`
- `supabase.test.ts`
- `cors.test.ts`

(`anthropic.integration.test.ts` y `openai.integration.test.ts` van al informe de integración.)

#### Edge functions (2)
- `webhook-pdf/handlers.test.ts`
- `upload-convenio/index.test.ts`

### Huecos detectados

- **Sin tests unitarios** en la carpeta `infrastructure/` de Supabase (adapters concretos). Sólo se prueban vía `lib/`. Al ser thin wrappers puede ser aceptable, pero conviene documentarlo.
- **Edge function `chat/index.ts`**: no aparece un test propio del entry point; se prueba mediante `handlers.test.ts`. Aceptable si el entry es sólo bootstrapping.
- **4 tests ignorados** en la suite Deno — hay que identificarlos y decidir si eliminarlos o repararlos.

### Posibles redundancias
- Verificar solapamiento entre `data-classifier.test.ts`, `variable-extractor.test.ts` y `query-expander.test.ts` si los tres testean la clasificación de intents.

---

## Recomendaciones globales

1. **Subir cobertura de repositorios** (`src/infrastructure/repositories`): son la frontera con Supabase y hoy están en ~3%.
2. **Cubrir `lib/chat-api.ts`**: es el cliente que consume el stream SSE; 18% es riesgo alto.
3. **Añadir métrica de coverage Deno** al pipeline para tener un número comparable al de front.
4. **Revisar los 4 tests `ignored`** en Deno — decidir si se rehabilitan o se borran.
5. **Consolidar ConvenioUploader**: 6 ficheros para un mismo organismo probablemente contengan escenarios duplicados.
