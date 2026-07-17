# Análisis SRP — `ask-question.ts`

**Fecha:** 2026-07-13
**Archivo:** `supabase/functions/_shared/core/chat/ask-question.ts` (711 líneas)
**Paradigma:** funcional (Deno + TypeScript, sin clases)
**Skill aplicada:** `.agents/skills/single-responsibility/SKILL.md`
**Contexto previo:** [`001-srp-audit.md`](./001-srp-audit.md) — ya identificó este archivo como violación 🔴 #1.

---

## 1. Test de las tres preguntas (skill SRP)

Aplico el test silencioso antes de diseñar:

1. **Reasons to change** — describir el archivo hoy en voz alta obliga a decir:
   > "Verifica cuota **y** expande la consulta **y** consulta la cache semántica **y** carga convenio **y** busca chunks **y** expande vecinos **y** construye prompts **y** llama al LLM **y** guarda cache **y** persiste historial **y** incrementa cuota **y** mapea errores."
   → **11 "y"**. Falla el test.

2. **Audience of change** — el mismo archivo lo tocan roles distintos por razones distintas:
   - **Backend/RAG dev** cambia `EXPANDED_CHUNK_CAP`, umbrales, expansión de vecinos.
   - **Prompt engineer** cambia el mapeo a `ChunkResult` y qué campos de metadata se pasan.
   - **Data engineer** cambia reglas de `getChunkArticulo` (tipos como `tabla_salarial`, secciones ANEXO).
   - **Product / billing** toca cuota y `incrementQueryCount`.
   - **Infra / observabilidad** cambia el mapeo de errores (`handleError`).
   → 4 audiencias en el mismo archivo. Falla el test.

3. **Test isolation** — `AskQuestionDeps` tiene **12 dependencias inyectables**. El test unitario del "flujo RAG" hoy exige mockear cache, persistencia, cuota y Anthropic aunque solo quieras validar la orquestación. Falla el test.

Los tres puntos fallan → **procede refactor**.

---

## 2. Responsabilidades identificadas en el archivo actual

Mapeo del contenido bloque a bloque:

| Bloque | Líneas | Responsabilidad | ¿Pura? | Estado |
|---|---|---|---|---|
| Tipos `AskQuestionInput/Result/*` | 48–128 | Contratos del use case | pura | Extraíble |
| Constantes (`DEFAULT_CHUNK_LIMIT`, `CACHE_THRESHOLD`, `MODEL_NAME`, `EXPANDED_CHUNK_CAP`) | 134–139 | Configuración RAG | pura | Extraíble |
| `AskQuestionDeps` + `defaultDeps` | 145–201 | Wiring de dependencias | pura | Extraíble |
| `getChunkArticulo` | 214–243 | Regla de dominio (qué chunks muestran artículo) | pura | Extraíble |
| `detectChunkGroups` / `fetchNeighborsForGroups` / `mergeChunks` / `expandChunksWithNeighbors` | 264–350 | Expansión de vecinos (RAG) | mixta (I/O + puro) | Extraíble como módulo |
| `mapChunksToPromptFormat` | 357–370 | Adaptador chunks → prompt | pura | Extraíble |
| `buildCitations` | 375–392 | Adaptador chunks → citaciones | pura | Extraíble |
| `askQuestion` (orquestador) | 416–641 | Flujo RAG end-to-end | I/O + branching | Debe quedarse como composición delgada |
| `handleError` | 646–693 | Mapeo error → resultado tipado | pura | Extraíble |
| `buildCacheKeyText` | 700–711 | Cache key semántica | pura | Extraíble |

**Diagnóstico:** el archivo mezcla **datos (tipos + constantes)**, **reglas puras de dominio** (getChunkArticulo, mergeChunks, buildCacheKeyText, buildCitations), **acceso a I/O** (expansión de vecinos, cache, persistencia) y **orquestación** en un único fichero de 711 líneas — por encima del techo de 300 que fija la skill.

---

## 3. Violaciones críticas SRP (paradigma funcional)

### 🔴 3.1 Mezcla I/O + lógica pura en el orquestador

`askQuestion` combina:
- llamadas a red / DB (embed, cache, convenio, chunks, Anthropic, persistence)
- decisiones de negocio (cache hit → salida, sin cuota → salida, not found → salida)
- transformaciones puras inline (`chunksFormatted`, `citations`, `buildCacheKeyText`)

En FP esto es el smell nº 1: **la parte pura no puede testearse sin mockear 12 dependencias**. La pureza está aprisionada en medio del pipe de I/O.

### 🔴 3.2 Cleanup del stream = mini use case oculto

Las líneas 535–583 (`cleanup` del branch streaming) reproducen **fire-and-forget de cache + persistencia + increment de cuota** — exactamente el mismo bloque que 597–619 en el branch no-streaming, con try/catch por función. Es duplicación interna del propio archivo y esconde una responsabilidad reutilizable: **"finalizar una respuesta LLM (persistir + cachear + contabilizar)"**.

### 🔴 3.3 Expansión de vecinos vive dentro del use case

`detectChunkGroups`, `fetchNeighborsForGroups`, `mergeChunks`, `expandChunksWithNeighbors` son un módulo entero (~90 líneas) con su propia semántica (deduplicar por chunk_id, orden por similarity/numero_chunk, cap a 15). No tiene nada que ver con "responder una pregunta" — es "expandir un set de chunks recuperados". Debería vivir aparte y tener su propio test.

### 🔴 3.4 Reglas de dominio embebidas: `getChunkArticulo`

Contiene conocimiento del negocio (qué secciones son ANEXO, tabla_salarial mal referenciada, categorías profesionales sin artículo). Esa regla se usa en dos sitios (`mapChunksToPromptFormat` y `buildCitations`) y es candidata a cambiar sola cuando aparezcan nuevos tipos de convenio. Debe salir del archivo.

### 🟡 3.5 `handleError` es un mapper puro secuestrado

92% del código de `handleError` es un `switch` sobre tipos de error de librerías externas. No pertenece al orquestador — pertenece a un adaptador error→resultado que cualquier use case chat podría reutilizar (calculate-salary hoy probablemente duplica esta lógica; ver `001-srp-audit.md` §2).

### 🟡 3.6 Constantes de configuración RAG mezcladas con lógica

`DEFAULT_CHUNK_LIMIT`, `DEFAULT_CHUNK_THRESHOLD`, `CACHE_THRESHOLD`, `MODEL_NAME`, `EXPANDED_CHUNK_CAP` son knobs que ajusta el equipo de RAG. Cambian por razones distintas al código de flujo. En un módulo funcional deberían vivir en un `config.ts` compartido para que `calculate-salary` los reutilice sin copiar valores.

---

## 4. Propuesta de reorganización (tipados / helpers / constantes / funciones)

Sigo tu petición explícita de separar por **tipo de artefacto** y a la vez respeto la regla de la skill de "agrupar por responsabilidad, no por kind". La solución intermedia: crear una **carpeta `ask-question/`** con submódulos cohesivos.

```
supabase/functions/_shared/core/chat/
├── ask-question/
│   ├── index.ts              # re-export del use case (mantiene compat con imports actuales)
│   ├── types.ts              # AskQuestionInput/Result/* + AskQuestionDeps (interface)
│   ├── config.ts             # DEFAULT_CHUNK_LIMIT, CACHE_THRESHOLD, MODEL_NAME, EXPANDED_CHUNK_CAP
│   ├── deps.ts               # defaultDeps (wiring producción)
│   ├── chunk-rules.ts        # getChunkArticulo + mapChunksToPromptFormat + buildCitations (PURO)
│   ├── chunk-expansion.ts    # detectChunkGroups + mergeChunks + expandChunksWithNeighbors
│   ├── cache-key.ts          # buildCacheKeyText (PURO)
│   ├── finalize.ts           # persistResponse(): cache + saveChatMessage + incrementQueryCount
│   ├── error-mapper.ts       # handleError → AskQuestionError
│   └── ask-question.ts       # orquestador delgado (~120 líneas objetivo)
```

### Contenido y razón de cada archivo

| Archivo | Contiene | Razón de existir |
|---|---|---|
| `types.ts` | Todas las interfaces del use case + `AskQuestionDeps`. | Cambia cuando cambia el contrato público. |
| `config.ts` | Solo constantes RAG. | Cambia cuando el equipo RAG ajusta umbrales/modelo. Reutilizable por `calculate-salary`. |
| `deps.ts` | `defaultDeps` únicamente. | Cambia cuando cambia el wiring de producción; aislado del uso case y del contrato. |
| `chunk-rules.ts` | `getChunkArticulo`, `mapChunksToPromptFormat`, `buildCitations`. Todo puro. | Cambia con reglas de dominio de convenios (ANEXOS, tabla_salarial). Testeable sin mocks. |
| `chunk-expansion.ts` | Expansión de vecinos. Función pública `expandChunksWithNeighbors`, helpers internos privados. | Cambia con la estrategia de recuperación RAG. Testable con un solo mock (`getChunksByGroup`). |
| `cache-key.ts` | `buildCacheKeyText`. | Regla pura, testable aislada. Puede compartirse con calculate-salary. |
| `finalize.ts` | Función `persistResponse({ deps, embedding, question, response, convenioId, citations, sessionId, userId })` que absorbe el bloque duplicado stream/no-stream. | Elimina la duplicación §3.2. Una única razón para cambiar: "cómo se finaliza una respuesta". |
| `error-mapper.ts` | `handleError`. | Mapper puro reutilizable por otros use cases chat. |
| `ask-question.ts` | Solo `askQuestion()`: cuota → cache → convenio → retrieve → expand → prompts → LLM (stream o no) → finalize → return. Composición pura del pipeline. | Cambia cuando cambia **el flujo**, no cuando cambia una regla o un umbral. |
| `index.ts` | `export { askQuestion, defaultDeps, type AskQuestionInput, ... } from ...` | Compatibilidad con imports actuales (`from "./ask-question.ts"` se sustituye por `from "./ask-question/index.ts"` o alias). |

### Cómo queda el orquestador (esqueleto objetivo)

```ts
export async function askQuestion(input, deps = defaultDeps): Promise<AskQuestionResult> {
  const startTime = Date.now();
  try {
    const quota = await deps.checkUserQuota(input.userId);
    if (!quota.hasQuota) return quotaExceeded();

    const expandedQuery = expandQuery(input.pregunta);
    const embedding = await deps.embedQuestion(
      buildCacheKeyText(expandedQuery, input.variables),
    );

    const cacheHit = await deps.searchSemanticCache(embedding, input.convenioId, CACHE_THRESHOLD);
    if (cacheHit) return cacheHitResult(cacheHit, startTime);

    const convenio = await deps.getConvenioById(input.convenioId);
    if (!convenio) return notFound(input.convenioId);

    const [rawChunks, perfil] = await Promise.all([
      deps.searchChunksByConvenio(embedding, input.convenioId, DEFAULT_CHUNK_LIMIT, DEFAULT_CHUNK_THRESHOLD),
      deps.getPerfilByConvenio(input.convenioId),
    ]);
    const chunks = await expandChunksWithNeighbors(rawChunks, input.convenioId, deps.getChunksByGroup);

    const { systemPrompt, userMessage } = buildPrompts(chunks, perfil, convenio, input);
    const citations = buildCitations(chunks, convenio.url_pdf ?? null);

    if (input.stream) {
      const stream = await deps.streamChatResponse({ systemPrompt, userMessage });
      return {
        type: "stream",
        stream,
        citations,
        cleanup: (full) => persistResponse({ deps, input, embedding, response: full, citations }),
      };
    }

    const response = await deps.createChatResponse({ systemPrompt, userMessage });
    await persistResponse({ deps, input, embedding, response, citations });
    return successResult(response, chunks.length, startTime);
  } catch (error) {
    return handleError(error);
  }
}
```

Resultado: **~120 líneas, cero helpers internos, una única razón para cambiar (el flujo)**.

---

## 5. Impacto en `calculate-salary.ts` — y aviso importante sobre ownership

> ⚠️ **Corrección respecto a una versión anterior de este documento.** Inicialmente sugerí que 6 de los 9 módulos nuevos serían "directamente reutilizables por `calculate-salary`". Esa afirmación era engañosa: si esos módulos viven **dentro** de `ask-question/`, entonces ese use case sería su dueño y `calculate-salary` se convertiría en cliente parásito de la carpeta de un hermano. Eso rompe el ownership y viola la cohesión que perseguimos.

### Regla que aplicamos

Un módulo compartido debe vivir en una carpeta compartida. Nunca en la carpeta de uno de sus clientes.

### Decisión para este PR (conservadora)

**Este refactor toca únicamente `ask-question/`.** No promocionamos nada a una carpeta común todavía, porque:

1. La skill SRP dice: *"el coste de una abstracción extra debe pagarlo una necesidad real y recurrente"*. Hoy solo hay **un** cliente confirmado (ask-question); el segundo (calculate-salary) es hipótesis hasta que abramos su archivo.
2. Diseñar `rag/` a ciegas, sin ver las firmas reales que necesita `calculate-salary`, tiene alta probabilidad de requerir retoques después. Es más barato **promocionar** módulos de `ask-question/` a `rag/` cuando ataquemos calculate-salary (un `git mv` + ajuste de imports) que rediseñar una abstracción especulativa.
3. Un PR que solo mejora `ask-question.ts` es más pequeño, más revisable y más fácil de revertir si algo se tuerce.

### Plan de futuro (NO parte de este PR)

Cuando se aborde el refactor de `calculate-salary.ts` en un PR posterior:

1. Confirmar con el código real cuáles de estos módulos tienen **firma idéntica o casi idéntica** para ambos use cases:
   - candidatos fuertes: `config.ts`, `cache-key.ts`, `error-mapper.ts`, `finalize.ts`
   - candidatos probables: `chunk-expansion.ts`, `chunk-rules.ts`
2. Crear `supabase/functions/_shared/core/chat/rag/` y **mover** (no copiar) desde `ask-question/` los módulos verificados como compartidos.
3. Ajustar imports en `ask-question/` y consumir desde `calculate-salary/`.
4. Documentar la decisión en el ADR `004-rag-orchestrator-shared.md` sugerido por la auditoría 001.

### Estructura objetivo tras ambos PRs (referencia)

```
supabase/functions/_shared/core/chat/
├── rag/                       # promocionado en el PR de calculate-salary
│   ├── config.ts
│   ├── cache-key.ts
│   ├── chunk-rules.ts
│   ├── chunk-expansion.ts
│   ├── finalize.ts
│   └── error-mapper.ts
├── ask-question/              # este PR — pero sin rag/ dentro
│   ├── index.ts
│   ├── types.ts
│   ├── deps.ts
│   └── ask-question.ts
└── calculate-salary/          # PR futuro
    └── ...
```

**Importante:** en el PR *actual* los módulos compartibles viven dentro de `ask-question/` provisionalmente. La promoción a `rag/` se hace más tarde, con evidencia en la mano, no ahora por especulación.

---

## 6. Riesgos y notas de ejecución

- **Tests existentes:** `ask-question.test.ts` (886 líneas) importa símbolos de `ask-question.ts`. Manteniendo `index.ts` como barrel se preservan imports.
- **Deno + import maps:** los `.ts` extensions son obligatorios; verificar `deno.json` no rompe con la nueva estructura de carpeta.
- **Fire-and-forget en `finalize.ts`:** conservar la semántica actual (cache y saveChatMessage no bloquean, incrementQueryCount sí). Documentarlo en el JSDoc de `persistResponse` para no perderlo en el refactor.
- **Orden de extracción sugerido (mínimo riesgo → máximo valor):**
  1. `types.ts` + `config.ts` (mecánico, sin lógica)
  2. `cache-key.ts` + `error-mapper.ts` (funciones puras aisladas)
  3. `chunk-rules.ts` (puro, con test propio nuevo)
  4. `chunk-expansion.ts` (una sola dep: `getChunksByGroup`)
  5. `finalize.ts` (colapsa duplicación stream/no-stream)
  6. `deps.ts` + reescritura del orquestador
- **No dividir más allá de esto.** La skill exige "el menor split que elimine una razón de cambio". Extraer, por ejemplo, `buildPrompts` a un archivo propio sería sobreingeniería porque `prompts.ts` ya existe con esa responsabilidad.

---

## 7. Checklist de validación post-refactor

- [ ] `pnpm test:deno` sigue en verde sin modificar assertions.
- [ ] `ask-question.ts` (orquestador) < 200 líneas.
- [ ] Ningún archivo nuevo > 200 líneas.
- [ ] Cada archivo puede describirse en una frase sin usar "y".
- [ ] Los helpers puros (`chunk-rules`, `cache-key`, `error-mapper`) tienen test unitario sin mocks.
- [ ] `calculate-salary.ts` no ha sido modificado (refactor aislado en este PR).

---

## 8. Próximo paso recomendado

Ejecutar los pasos 1–2 del orden sugerido (extracción de `types.ts` + `config.ts` + `cache-key.ts` + `error-mapper.ts`) como **primer commit atómico**. Es puramente mecánico, no altera comportamiento y deja el terreno listo para los pasos 3–6 en commits separados.
