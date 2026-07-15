# Análisis SRP — `calculate-salary.ts`

**Fecha:** 2026-07-15
**Archivo:** `supabase/functions/_shared/core/chat/calculate-salary.ts` (649 líneas)
**Paradigma:** funcional (Deno + TypeScript)
**Skill aplicada:** `.agents/skills/single-responsibility/SKILL.md`
**Contexto previo:**
- [`001-srp-audit.md`](./001-srp-audit.md) — auditoría original (violación 🔴 #2).
- [`002-ask-question-srp.md`](./002-ask-question-srp.md) — refactor ya ejecutado sobre `ask-question/` que dejó preparado el terreno para promocionar módulos compartidos.

---

## 1. Test de las tres preguntas (skill SRP)

1. **Reasons to change** — describir el archivo hoy obliga a decir:
   > "Verifica cuota **y** expande consulta **y** consulta cache semántica **y** carga convenio **y** busca chunks **y** carga perfil **y** extrae variables **y** clasifica estado de datos **y** construye mensajes de estados incompletos/inválidos/conflictivos **y** resuelve variables activas para el front **y** construye prompt de cálculo **y** llama al LLM **y** persiste cache **y** persiste historial **y** incrementa cuota **y** mapea errores."
   → **15 "y"**. Falla.

2. **Audience of change** — mismos 4 roles que en `ask-question` (backend/RAG, prompt engineer, data engineer, product/billing) **más** un quinto propio: el equipo que mantiene la lógica de variables y clasificación de datos (`extractVariables`, `classifyDataState`, `buildResolvedVariables`, mensajes de estado). Falla.

3. **Test isolation** — `CalculateSalaryDeps` tiene **11 dependencias inyectables** idénticas a las de `ask-question` (menos `getChunksByGroup` porque este use case aún **no expande vecinos**). Para probar sólo la lógica de clasificación de variables (la única responsabilidad realmente propia) hoy hay que mockear cache, persistencia, embeddings y Anthropic. Falla.

Los tres tests fallan → procede refactor.

---

## 2. Diff conceptual con `ask-question.ts` (post-refactor)

Este es el punto clave del análisis: **calculate-salary comparte ~65% de su código con ask-question**. Comparación bloque a bloque contra los módulos ya extraídos en `ask-question/`:

| Bloque en `calculate-salary.ts` | Líneas | Equivalente en `ask-question/` | Diferencia real |
|---|---|---|---|
| Constantes RAG (`DEFAULT_CHUNK_LIMIT`, `DEFAULT_CHUNK_THRESHOLD`, `CACHE_THRESHOLD`, `MODEL_NAME`) | 148–151 | `config.ts` | **Idénticas.** Falta `EXPANDED_CHUNK_CAP` porque este use case no expande vecinos. |
| `CalculateSalaryDeps` + `defaultDeps` | 92–142 | `types.ts` (`AskQuestionDeps`) + `deps.ts` | Sub-conjunto exacto de `AskQuestionDeps` menos `getChunksByGroup`. |
| `buildCacheKeyText` | 512–523 | `cache-key.ts` | Firma difiere: acepta `Record<string, string \| number \| undefined>` vs solo `string`. Comportamiento idéntico salvo el tipo. |
| `getChunkArticulo` | 529–537 | `chunk-rules.ts` | **⚠️ Divergencia real:** calculate-salary tiene la versión antigua (solo excluye `tabla_salarial`). La versión de `ask-question` es más rica (también excluye ANEXOS, clasificación profesional, etc.). |
| `mapChunksToPromptFormat` | 544–555 | `chunk-rules.ts` | Idéntica. |
| `buildCitations` | 560–577 | `chunk-rules.ts` | Idéntica. |
| Bloque de finalización (cache + historial + cuota) — rama stream | 366–410 | `finalize.ts` (`persistResponse` con `sequentialMessages: false`) | Idéntica salvo el tag de log. |
| Bloque de finalización — rama no-stream | 423–448 | `finalize.ts` (`persistResponse` con `sequentialMessages: true`) | Idéntica salvo el tag de log. |
| `handleError` | 599–646 | `error-mapper.ts` | Idéntica salvo el tag `[calculate-salary]` vs `[ask-question]`. |
| Cuota / cache-hit / not-found / orquestación de embedding+chunks | dispersos | Flujo de `ask-question.ts` | Estructura idéntica. |

**Responsabilidades genuinamente propias de calculate-salary (no compartibles):**
- Extracción de variables (`extractVariables`, `mergeVariables`, `normalizeKnownVariables`) — ya vive en `variable-extractor.ts` ✅
- Clasificación de estado (`classifyDataState`) y sus mensajes — ya vive en `data-classifier.ts` ✅
- `buildResolvedVariables` (líneas 490–504) — mapea variables canónicas a claves crudas del perfil que el front usa como ids de chips.
- `variablesToRecord` (líneas 582–594) — adaptador para el prompt.
- 3 tipos de retorno propios (`salary_calculated`, `incomplete_data`, `invalid_data`) y su ensamblado.
- Orden específico del flujo (extraer variables → clasificar → **cortocircuitar si incompleto/inválido/conflicto** antes de llamar al LLM).

Ese cortocircuito **es la única diferencia estructural de flujo** con `ask-question`. Todo lo demás es duplicación.

---

## 3. Violaciones críticas SRP

### 🔴 3.1 Duplicación masiva con `ask-question`
La sección §2 lo evidencia. Cambiar `handleError`, `buildCacheKeyText`, `finalize` o cualquier constante RAG obliga a tocar dos archivos con riesgo de que uno se olvide (ya ha pasado con `getChunkArticulo`, que aquí quedó desincronizado). Es el problema #1.

### 🔴 3.2 Cleanup del stream = mini use case oculto (mismo síntoma que ask-question §3.2)
Líneas 366–410 y 423–448 reproducen la triple llamada cache + historial + cuota con try/catch por función. Idéntica duplicación interna a la que ya resolvió `finalize.ts`.

### 🔴 3.3 `getChunkArticulo` divergente
La versión en calculate-salary sólo excluye `tabla_salarial`; la de ask-question también excluye ANEXOS. **Consecuencia real:** las citaciones que devuelve calculate-salary pueden mostrar `Art. 12` para chunks que en realidad vienen de un ANEXO, mientras que ask-question filtra bien. Bug latente causado precisamente por la duplicación.

### 🔴 3.4 Orquestador mezcla flujo + adaptadores puros inline
`buildResolvedVariables` y `variablesToRecord` son puros y merecen su propio archivo `variable-adapters.ts` — hoy están al final del fichero mezclados con helpers duplicados.

### 🟡 3.5 Constantes RAG mezcladas con lógica (mismo síntoma que ask-question §3.6)
Ya resuelto conceptualmente por `config.ts`. Aquí sólo hay que dejar de duplicarlas.

### 🟡 3.6 Tipos del use case desperdigados
`CalculateSalaryResult`, `CalculateSalaryDeps` y `defaultDeps` viven en el mismo archivo del orquestador. Los tipos de resultado específicos (`CalculateSalarySuccess`, `Incomplete`, `Invalid`) sí están en `types.ts` compartido — bien.

---

## 4. Estrategia: promocionar `ask-question/` → `rag/` **como paso previo**

El plan del documento 002 ya lo anticipaba (§5). Es el momento.

### 4.1 Regla que aplicamos
Un módulo compartido debe vivir en carpeta compartida. Nunca en la carpeta de uno de sus clientes. Hoy los módulos genéricos viven en `ask-question/` porque no había segundo cliente confirmado. Calculate-salary confirma la necesidad.

### 4.2 Qué se promociona a `rag/` (evidencia en la mano)

| Módulo actual | Motivo de promoción | Cambios necesarios |
|---|---|---|
| `ask-question/config.ts` | Constantes RAG idénticas. Añadir `EXPANDED_CHUNK_CAP` opcional según uso. | Ninguno funcional. |
| `ask-question/cache-key.ts` | Firma idéntica en concepto; ampliar tipo de `variables` a `Record<string, string \| number \| undefined>` para admitir el uso actual de calculate-salary. | Cambio de tipo retro-compatible. |
| `ask-question/chunk-rules.ts` | Idéntico + corrige el bug §3.3 aplicando la versión rica de `getChunkArticulo` a calculate-salary. | Ninguno funcional. |
| `ask-question/error-mapper.ts` | Idéntico salvo tag de log. Parametrizar tag: `handleError(error, { logTag })`. | Añadir parámetro opcional con default `"ask-question"`. |
| `ask-question/finalize.ts` | Idéntico. Ya expone `logTag` y `sequentialMessages` como params. Perfecto. | Renombrar tag interno para no acoplar el texto de log a `[ask-question]`. |

### 4.3 Qué NO se promociona (aún)
- `ask-question/chunk-expansion.ts` — calculate-salary **no expande vecinos**. Promocionar sería especular. Se queda en `ask-question/`.
- `ask-question/types.ts` — contiene `AskQuestionDeps` acoplada al use case (aunque sea sub/super conjunto de la de salary). Cada use case mantiene su tipo `Deps` propio; el tipo `ChatCitation` ya vive en `types.ts` compartido.
- `ask-question/deps.ts` — el wiring de dependencias es específico de cada use case.
- `ask-question/ask-question.ts` / `index.ts` — orquestador propio.

### 4.4 Estructura objetivo tras este PR

```
supabase/functions/_shared/core/chat/
├── rag/                          # NUEVO — promocionado desde ask-question/
│   ├── config.ts                 # (+ opcional EXPANDED_CHUNK_CAP)
│   ├── cache-key.ts              # tipo de variables ampliado
│   ├── chunk-rules.ts            # versión rica de getChunkArticulo
│   ├── error-mapper.ts           # handleError(error, { logTag })
│   └── finalize.ts               # persistResponse con logTag parametrizado
├── ask-question/
│   ├── index.ts
│   ├── types.ts                  # AskQuestionDeps se mantiene aquí
│   ├── deps.ts
│   ├── chunk-expansion.ts        # sigue aquí (no compartido)
│   └── ask-question.ts           # imports pasan de "./config" a "../rag/config"
└── calculate-salary/             # NUEVA carpeta, análoga a ask-question/
    ├── index.ts                  # barrel compat (`from "./calculate-salary.ts"` sigue funcionando)
    ├── types.ts                  # CalculateSalaryDeps + CalculateSalaryResult
    ├── deps.ts                   # defaultDeps
    ├── variable-adapters.ts      # buildResolvedVariables + variablesToRecord (PURO)
    └── calculate-salary.ts       # orquestador delgado (~150 líneas objetivo)
```

---

## 5. Propuesta de reorganización de `calculate-salary/`

### 5.1 Archivos y responsabilidades

| Archivo | Contiene | Razón de existir |
|---|---|---|
| `types.ts` | `CalculateSalaryDeps` (interface), `CalculateSalaryResult` (unión). | Cambia con el contrato público del use case. |
| `deps.ts` | `defaultDeps` (wiring producción). | Cambia con el wiring; aislado del contrato. |
| `variable-adapters.ts` | `buildResolvedVariables` + `variablesToRecord`. Ambos puros. | Cambian cuando cambia el contrato de variables entre backend y front (chips, prompt). Testables sin mocks. |
| `calculate-salary.ts` | Sólo `calculateSalary()`: cuota → cache → convenio → chunks+perfil → extraer variables → clasificar → **cortocircuito** → prompt → LLM (stream/no) → finalize. | Cambia cuando cambia el flujo, no cuando cambia una regla. |
| `index.ts` | Re-export para compat: `export { calculateSalary, defaultDeps, type CalculateSalaryDeps, ... }`. | Compatibilidad con imports actuales de `handlers.ts` u otros consumidores. |

### 5.2 Esqueleto objetivo del orquestador

```ts
export async function calculateSalary(
  input: CalculateSalaryInput,
  deps: CalculateSalaryDeps = defaultDeps,
): Promise<CalculateSalaryResult> {
  const startTime = Date.now();
  try {
    const quota = await deps.checkUserQuota(input.userId);
    if (!quota.hasQuota) return quotaExceeded();

    const expandedQuery = expandQuery(input.pregunta);
    const embedding = await deps.embedQuestion(
      buildCacheKeyText(expandedQuery, input.variablesConocidas),
    );

    const cacheHit = await deps.searchSemanticCache(embedding, input.convenioId, CACHE_THRESHOLD);
    if (cacheHit) return cacheHitResult(cacheHit, startTime);

    const convenio = await deps.getConvenioById(input.convenioId);
    if (!convenio) return notFound(input.convenioId);

    const [chunks, perfil] = await Promise.all([
      deps.searchChunksByConvenio(embedding, input.convenioId, DEFAULT_CHUNK_LIMIT, DEFAULT_CHUNK_THRESHOLD),
      deps.getPerfilByConvenio(input.convenioId),
    ]);
    const perfilContexto = normalizePerfilContexto(perfil);

    const extractedVars = extractVariables(expandedQuery, perfilContexto);
    const allVariables = mergeVariables(
      normalizeKnownVariables(input.variablesConocidas),
      extractedVars,
    );
    const classification = classifyDataState(allVariables, perfilContexto);
    const citations = buildCitations(chunks, convenio.url_pdf ?? null);
    const resolvedVariables = buildResolvedVariables(allVariables, perfilContexto);

    // Cortocircuito: estados no-completos NO llaman al LLM.
    const shortCircuit = handleShortCircuit(classification, convenio.nombre, citations, resolvedVariables);
    if (shortCircuit) return shortCircuit;

    const { systemPrompt, userMessage } = buildSalaryPrompts(
      chunks, perfilContexto, convenio, input, allVariables, classification,
    );

    const finalizeCtx = {
      deps, embedding, question: input.pregunta, convenioId: input.convenioId,
      citations, sessionId: input.sessionId, userId: input.userId,
      logTag: "calculate-salary",
    };

    if (input.stream) {
      const stream = await deps.streamChatResponse({ systemPrompt, userMessage });
      return {
        type: "stream", stream, citations, resolvedVariables,
        cleanup: (full) => persistResponse({ ...finalizeCtx, response: full, sequentialMessages: false }),
      };
    }

    const response = await deps.createChatResponse({ systemPrompt, userMessage });
    await persistResponse({ ...finalizeCtx, response, sequentialMessages: true });
    return successResult(response, chunks.length, allVariables, resolvedVariables, citations, startTime);
  } catch (error) {
    return handleError(error, { logTag: "calculate-salary" });
  }
}
```

Objetivo: **~150 líneas, cero helpers duplicados, una única razón para cambiar (el flujo de cálculo salarial con su cortocircuito por clasificación de datos)**.

---

## 6. Plan de ejecución por commits atómicos

Cada paso es reversible por sí mismo. `pnpm test:deno` debe pasar tras cada commit.

### Paso 1 — Promoción a `rag/` (sin tocar calculate-salary aún)
1. `mkdir supabase/functions/_shared/core/chat/rag/`
2. `git mv ask-question/config.ts rag/config.ts`
3. `git mv ask-question/cache-key.ts rag/cache-key.ts` → ampliar tipo de `variables` a `Record<string, string | number | undefined>`.
4. `git mv ask-question/chunk-rules.ts rag/chunk-rules.ts`
5. `git mv ask-question/error-mapper.ts rag/error-mapper.ts` → añadir parámetro `{ logTag = "ask-question" } = {}`.
6. `git mv ask-question/finalize.ts rag/finalize.ts` → cambiar el string literal `[ask-question]` por `[${logTag}]`.
7. Ajustar imports en `ask-question/ask-question.ts`, `ask-question/index.ts` (y tests) de `./config` → `../rag/config`, etc.
8. Verificar `pnpm test:deno` en verde.
9. **Commit:** `refactor(rag): promote shared modules from ask-question to rag/`.

### Paso 2 — Crear estructura `calculate-salary/` (mecánico, sin cambio de comportamiento)
1. `mkdir calculate-salary/`
2. Crear `calculate-salary/types.ts` con `CalculateSalaryDeps` y `CalculateSalaryResult` (movidos del archivo actual).
3. Crear `calculate-salary/deps.ts` con `defaultDeps`.
4. Crear `calculate-salary/variable-adapters.ts` con `buildResolvedVariables` + `variablesToRecord`.
5. Crear `calculate-salary/index.ts` como barrel.
6. **Aún no** modificar `calculate-salary.ts` original: sólo extraer archivos y verificar que compila.
7. **Commit:** `refactor(calculate-salary): extract types, deps and variable adapters`.

### Paso 3 — Reescribir el orquestador usando `rag/`
1. Reemplazar en `calculate-salary.ts` los helpers duplicados por imports de `../rag/*`.
2. Sustituir los dos bloques de finalización (stream y no-stream) por `persistResponse(...)` de `rag/finalize.ts` con `logTag: "calculate-salary"` y `sequentialMessages` según rama.
3. Sustituir `handleError` local por el de `rag/error-mapper.ts` pasando `{ logTag: "calculate-salary" }`.
4. Extraer el bloque de cortocircuito (líneas 302–330 actuales) a helper interno `handleShortCircuit(...)` dentro del propio orquestador.
5. Mover `calculate-salary.ts` a `calculate-salary/calculate-salary.ts` y ajustar imports de `handlers.ts`.
6. Verificar `pnpm test:deno` en verde.
7. **Commit:** `refactor(calculate-salary): reuse rag/ modules and slim orchestrator`.

### Paso 4 — Limpieza de re-exports y verificación final
1. Confirmar que `calculate-salary/index.ts` mantiene `export { isSalaryQuery } from "../variable-extractor.ts"` (el archivo actual lo re-exporta al final).
2. Ejecutar `pnpm typecheck` + `pnpm test:deno` + `pnpm build`.
3. Verificar tamaños:
   - `rag/*.ts` — todos < 150 líneas.
   - `calculate-salary/calculate-salary.ts` — < 200 líneas.
   - `calculate-salary/*` sin archivos > 200 líneas.
4. **Commit:** `chore(calculate-salary): final cleanup and size checks`.

---

## 7. Riesgos y notas de ejecución

- **Bug latente §3.3:** al promocionar `chunk-rules.ts`, calculate-salary empezará a excluir el artículo para ANEXOS. Es un **cambio de comportamiento silencioso** (correcto, pero cambio). Los tests de calculate-salary que verifiquen citaciones sobre chunks de ANEXO deben actualizarse; si no existen, añadirlos.
- **Firma de `buildCacheKeyText`:** ampliar el tipo de `variables` a `Record<string, string | number | undefined>` es retro-compatible con el uso actual de `ask-question` (que pasa `Record<string, string>`).
- **Tag de log parametrizado:** en `finalize.ts` y `error-mapper.ts` cambia el prefijo `[ask-question]` por `[${logTag}]`. Cualquier alerta/observabilidad que grepee esos prefijos hay que revisarla. `ask-question` seguirá emitiendo `[ask-question]` gracias al default.
- **Deno + extensiones `.ts`:** los `.ts` son obligatorios; comprobar `deno.json` si define alias.
- **`handlers.ts`:** consume `calculateSalary` desde `./calculate-salary.ts`. Mantener `calculate-salary.ts` como shim inicial o actualizar el import en el mismo commit del paso 3. Preferible actualizar el import y borrar el archivo antiguo — el nuevo `calculate-salary/index.ts` cubre la compatibilidad de símbolos.
- **Tests existentes:** `calculate-salary.test.ts` (si existe con importaciones al archivo antiguo) debe actualizarse en el paso 3.
- **No dividir más allá.** No extraer `buildSalaryPrompts` a otro archivo porque `prompts.ts` ya cubre esa responsabilidad. No crear `short-circuit.ts` porque su lógica es exclusivamente el pegado entre `classifyDataState` y el shape de retorno del use case: pertenece al orquestador.

---

## 8. Checklist de validación post-refactor

- [ ] `pnpm test:deno` en verde sin modificar assertions (salvo las que verifiquen el bug §3.3 corregido).
- [ ] `pnpm typecheck` y `pnpm build` sin errores.
- [ ] `calculate-salary/calculate-salary.ts` < 200 líneas.
- [ ] Ningún archivo en `rag/` > 150 líneas.
- [ ] Cero definiciones de `handleError`, `buildCacheKeyText`, `getChunkArticulo`, `mapChunksToPromptFormat`, `buildCitations`, constantes RAG o bloques cache+historial+cuota duplicadas entre `ask-question/` y `calculate-salary/`.
- [ ] Cada archivo puede describirse en una frase sin usar "y".
- [ ] `handlers.ts` sigue importando `calculateSalary` con la misma firma pública.
- [ ] `ChunkArticulo` para ANEXOS en calculate-salary devuelve `undefined` (bug §3.3 corregido).

---

## 9. Próximo paso recomendado

Ejecutar el **Paso 1** (promoción a `rag/`) como primer commit atómico. Es mecánico (`git mv` + ajustes de import + 2 firmas ampliadas), no altera comportamiento del use case `ask-question`, y deja el terreno listo para reescribir calculate-salary contra módulos ya compartidos.
