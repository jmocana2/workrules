# Informe de Tests de Integración

Fecha del informe: 2026-08-04

Se consideran tests de integración aquellos que ejercitan **más de una unidad real** trabajando conjuntamente (hook + provider + repos fake; SDK real contra servicio externo; use case + adapters), sin llegar al nivel de UI navegable con browser (eso es e2e).

## Resumen

| Ámbito | Ficheros | Tests | Notas |
|---|---|---|---|
| Frontend (`src/`) | 1 | ~5 (incluidos en los 380 unit) | Ejecutado por `pnpm test:unit` |
| Backend (`supabase/functions/_shared/lib/`) | 2 | Incluidos en los 518 | Ejecutado por `pnpm test:deno`. Requieren API keys reales (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`) o se skipean |

Cobertura específica: **no se mide por separado** — comparten runner y report con los unit tests.

---

## Frontend

### `src/ui/components/workrules/pages/ChatPage/useChatPage.integration.test.tsx`

- **Qué prueba**: el hook `useChatPage` completo, integrado con `RepositoriesProvider` y fakes de repositorios (`createFakeRepositories`), verificando el mapeo del protocolo del backend a estados de UI.
- **Estados cubiertos**:
  - A: respuesta completa con citaciones
  - B: datos incompletos → `DataRequestCard`
  - D: datos inválidos → `AlertInvalidData`
  - E: alerta SMI → `AlertSMI`
  - F: datos conflictivos → `AlertConflict`
- **Mocks**: `@ai-sdk/react` mockeado; repositorios fake reales; QueryClient real.
- **Valoración**: es el único test de integración de front. Cubre bien la máquina de estados, pero **no cubre**:
  - Estado C (respuesta correcta con datos completos calculados)
  - Errores de red / retry
  - Cancelación de stream

---

## Backend / Supabase

### `supabase/functions/_shared/lib/anthropic.integration.test.ts`
- Ejerce el cliente Anthropic real contra la API. Se skipea si no hay `ANTHROPIC_API_KEY`.
- Verifica: llamadas de completion, manejo de stream, gestión de errores 401/429.

### `supabase/functions/_shared/lib/openai.integration.test.ts`
- Ejerce el cliente OpenAI real (embeddings). Se skipea si no hay `OPENAI_API_KEY`.
- Verifica: generación de embeddings y forma de la respuesta.

**Riesgo**: consumen cuota real. Recordar el issue conocido de Anthropic (saldo agotado en Fase 2). Recomendado marcarlos claramente como `@integration` y no correrlos en CI por defecto.

---

## Huecos detectados

1. **No hay tests de integración** entre `application/chat/handlers.ts` y sus adapters de infraestructura (`infrastructure/supabase/*`, `infrastructure/anthropic/*`). Hoy sólo hay unit con mocks de puertos.
2. **No hay integración** para el flujo `upload-convenio` → `webhook-pdf` end-to-end (recepción de webhook Storage → procesamiento PDF).
3. **Front**: no hay integración de `ConvenioUploader` con `useConvenioUpload` + repositorio fake que valide el flujo completo de subida.
4. **RAG**: los módulos `application/chat/rag/*` (retrieval, error-mapper) no tienen tests de integración con un cliente Supabase fake que valide la SQL/RPC.

## Recomendaciones

- Definir convención de nombres: `*.integration.test.ts` (ya existe en backend) y adoptarla también en front (renombrar `useChatPage.integration.test.tsx` está bien; extender el patrón).
- Añadir un script `test:integration` que filtre sólo estos ficheros (`vitest run --testNamePattern`/`--include` para front, y filtro Deno para back) para poder ejecutarlos por separado.
- Excluir por defecto los `*.integration.test.ts` de Deno del CI y ejecutarlos en un job programado con secretos.
