# Análisis SRP — `handlers.ts`

**Fecha:** 2026-07-15
**Archivo:** `supabase/functions/_shared/core/chat/handlers.ts` (617 líneas)
**Paradigma:** funcional (Deno + TypeScript)
**Skill aplicada:** `.agents/skills/single-responsibility/SKILL.md`
**Contexto previo:**
- [`001-srp-audit.md`](./001-srp-audit.md) — auditoría original (violación 🔴 #3).
- [`002-ask-question-srp.md`](./002-ask-question-srp.md) — refactor de `ask-question/`.
- [`003-calculate-salary-srp.md`](./003-calculate-salary-srp.md) — refactor de `calculate-salary/` + promoción a `rag/`.

Este es el **tercer y último** use case pendiente del bloque backend de la auditoría. Con `ask-question/` y `calculate-salary/` ya modularizados y `rag/` compartido, `handlers.ts` queda como el único fichero grande del backend chat y concentra 4 responsabilidades bien diferenciadas.

---

## 1. Test de las tres preguntas (skill SRP)

1. **Reasons to change** — describir el archivo hoy obliga a decir:
   > "Valida el body de la request **y** parsea JSON **y** extrae el userId del JWT **y** clasifica la pregunta (mode override, ranges, salary vs general) **y** transforma la pregunta cuando piden rangos **y** enruta al use case correcto **y** construye la metadata **y** mapea cada `type` del resultado a un status HTTP + shape JSON **y** serializa estados especiales (`incomplete`/`invalid`/`conflicting`) como SSE **y** transforma el stream de Anthropic a SSE de eventos `text`/`citation`/`done` **y** dispara el cleanup fire-and-forget."
   → **11 "y"**. Falla.

2. **Audience of change** — al menos 4 audiencias distintas tocan este archivo:
   - **Backend/API** — cambios en validación de request o códigos HTTP (`validateChatRequest`, `mapResultToHttpResponse`, `buildErrorResponse`).
   - **Routing/dominio** — cambia el criterio de clasificación de use cases (`classifyAndExecute`, `transformRangesRequest`).
   - **Streaming/protocolo SSE** — cambia el formato de eventos que consume el front (`handleStreamResponse`, `buildStatusStreamResponse`).
   - **Auth** — cambia el mecanismo de verificación del JWT (`extractUserIdFromRequest`).

   Falla.

3. **Test isolation** — no hay `Deps` inyectable en `handlers.ts` porque cada función tiene sus propias dependencias implícitas:
   - `extractUserIdFromRequest` depende de `verifyUserToken` (import directo).
   - `classifyAndExecute` depende de `askQuestion`, `calculateSalary`, `isSalaryQuery`, `isShowRangesRequest` (imports directos).
   - `handleStreamResponse` y `buildStatusStreamResponse` construyen `TextEncoder`/`ReadableStream` en el propio módulo.

   Para testear el formateo SSE aisladamente hay que montar un `ReadableStream` de Anthropic falso; para testear el routing hay que mockear ambos use cases; para testear la validación no hace falta nada. **Cada responsabilidad tiene un perfil de test radicalmente distinto** — señal clara de que conviven en el mismo archivo cosas que no deberían. Falla.

Los tres tests fallan → procede refactor.

---

## 2. Mapa de responsabilidades actuales

| Bloque | Líneas | Responsabilidad | ¿Puro? | Dependencias externas |
|---|---|---|---|---|
| `ValidationResult`, `ChatHandlerResponse` (interfaces) | 13–22 | Contratos HTTP internos | — | — |
| `validateChatRequest` | 27–78 | Validación de shape/tipos/longitud del body | ✅ | — |
| `parseRequestBody` | 83–96 | Parseo seguro de JSON | ❌ (async I/O) | `Request.json()` |
| `processChatRequest` | 102–117 | **Muerto** — placeholder pre-RAG. Nadie lo importa. | ✅ | — |
| `buildErrorResponse` | 122–134 | Constructor de shape de error | ✅ | — |
| `ChatUseCaseResult` (type) | 141 | Unión de resultados | — | — |
| `extractUserIdFromRequest` | 153–175 | Auth: extrae userId del `Authorization` header | ❌ | `verifyUserToken` |
| `transformRangesRequest` | 184–220 | Reescritura de pregunta para el caso "ver rangos" | ✅ | — |
| `classifyAndExecute` | 233–300 | Routing: elige use case y arma su input | ❌ | `askQuestion`, `calculateSalary`, `isSalaryQuery`, `isShowRangesRequest` |
| `mapResultToHttpResponse` | 312–423 | Mapeo `result.type` → `{ status, body }` | ✅ | — |
| `buildMetadata` | 428–445 | Constructor de `ChatMetadata` para respuestas JSON | ✅ | — |
| `buildStatusStreamResponse` | 454–544 | Serializa estados incomplete/invalid/conflicting como SSE | ✅ (dado un `result`) | `TextEncoder`, `ReadableStream` |
| `handleStreamResponse` | 554–617 | Transforma stream de Anthropic en SSE (`text`/`citation`/`done`) + dispara cleanup | ❌ (efectos: cleanup async) | `TextEncoder`, `TextDecoder`, `TransformStream` |

**Observaciones:**
- `processChatRequest` es código muerto (búsqueda: nadie lo importa fuera del propio módulo). Se elimina en el refactor.
- Todo lo relacionado con SSE (dos funciones, ~150 líneas) usa exactamente los mismos primitivos y produce el mismo formato de eventos. Encajan en un mismo módulo.
- Todo lo relacionado con clasificación/routing (`classifyAndExecute` + `transformRangesRequest`) es una unidad conceptual — el segundo sólo existe para el primero.
- Validación y parseo son helpers puros de "entrada HTTP", junto con `buildErrorResponse`.
- `mapResultToHttpResponse` + `buildMetadata` son helpers puros de "salida HTTP JSON". La metadata solo se usa en JSON, no en SSE.

---

## 3. Violaciones críticas SRP

### 🔴 3.1 Cuatro capas distintas mezcladas en un mismo archivo
El bloque HTTP (validación + parseo + status codes), el bloque routing (clasificación + transformación de pregunta), el bloque SSE (dos funciones que tocan streams) y el bloque auth (`extractUserIdFromRequest`) tienen ciclos de vida y audiencias distintos. Cambiar el formato SSE hoy obliga a abrir el mismo archivo donde vive la validación de tipos del body. Es el problema #1 y coincide con el diagnóstico de `001-srp-audit.md` §Backend/#3.

### 🔴 3.2 Routing acoplado a shape de request en `classifyAndExecute`
`classifyAndExecute` (líneas 233–300) hace tres cosas: elige use case (mode override → ranges → salary → general), construye el input de cada use case (con casts `as Record<string, string | number | undefined>` duplicados) y llama al use case. La construcción de input está copy-pasteada 3 veces entre las ramas salary y ask-question. Cualquier campo nuevo en `ChatRequest` (p.ej. `messages`, `mode`, `session_id`) obliga a tocar cada rama.

### 🔴 3.3 SSE hard-codeado dentro de `handleStreamResponse` y `buildStatusStreamResponse`
Ambas funciones construyen manualmente strings `data: ${JSON.stringify(...)}\n\n` con las mismas 4 shapes de evento (`status`, `text`, `citation`, `done`). Cualquier cambio en el protocolo SSE (nueva shape, versión, header extra) obliga a tocar dos funciones y arriesgar divergencia. Es el mismo síntoma que motivó `rag/finalize.ts` en el refactor anterior.

### 🟡 3.4 `processChatRequest` es código muerto
Placeholder pre-RAG con el comentario `TODO: Implementar RAG completo en I2.8`. La I2.8 ya está cerrada; nadie importa esta función. Debe borrarse.

### 🟡 3.5 `buildMetadata` está en el módulo raíz pero solo lo usa `mapResultToHttpResponse`
No es un problema grande — es un helper interno de una única función — pero pertenece al mismo módulo que `mapResultToHttpResponse`, no al de streaming.

### 🟡 3.6 `extractUserIdFromRequest` es la única función de auth y vive suelta
No comparte responsabilidad con nada más del archivo. Debe vivir en su propio módulo `auth/` o en `http/` como helper de request. Aisladamente es fácil de testear.

---

## 4. Estrategia

`rag/` ya está establecido para lógica compartida entre use cases. Para `handlers.ts` el equivalente natural es **separar por capa**, no por use case. Tres capas emergen del mapa de responsabilidades:

- **`http/`** — todo lo que entiende de `Request`/`Response` HTTP JSON: validación, parseo, auth, mapeo de resultado a status/body, construcción de errores y metadata.
- **`sse/`** — todo lo que emite eventos SSE al front: encoder común de eventos, transformador de stream de Anthropic y serializador de estados especiales.
- **`routing/`** — clasificación de la pregunta y ensamblado del input para cada use case.

`handlers.ts` desaparece como archivo grande. Se conserva sólo como **barrel** para no romper el import de `supabase/functions/chat/index.ts`.

### 4.1 Estructura objetivo

```
supabase/functions/_shared/core/chat/
├── rag/                          # (ya existente)
├── ask-question/                 # (ya existente)
├── calculate-salary/             # (ya existente)
├── http/                         # NUEVO
│   ├── request-validator.ts      # validateChatRequest + parseRequestBody
│   ├── auth.ts                   # extractUserIdFromRequest
│   ├── error-response.ts         # buildErrorResponse + ChatHandlerResponse type
│   └── result-mapper.ts          # mapResultToHttpResponse + buildMetadata
├── sse/                          # NUEVO
│   ├── sse-encoder.ts            # helpers puros: encodeEvent(name, payload), encodeDone(meta)
│   ├── status-stream.ts          # buildStatusStreamResponse
│   └── anthropic-stream.ts       # handleStreamResponse
├── routing/                      # NUEVO
│   ├── use-case-router.ts        # classifyAndExecute
│   └── ranges-transformer.ts     # transformRangesRequest (+ patterns)
└── handlers.ts                   # BARREL — re-exporta todo lo que hoy consume chat/index.ts
```

### 4.2 Reglas que aplicamos
- Cada archivo describe su responsabilidad en una frase sin usar "y".
- Nada de `_shared/lib/*` cambia: la auth sigue delegando en `verifyUserToken`.
- `handlers.ts` como barrel permite que el refactor sea invisible al consumidor (`chat/index.ts`). Si en el futuro `index.ts` migra a imports granulares, el barrel se puede borrar.
- Ningún módulo nuevo debe superar ~120 líneas.

### 4.3 Qué NO extraer (aún)
- No unificar `handleStreamResponse` y `buildStatusStreamResponse` en una sola función "polimórfica". Comparten el encoder de eventos pero su input y su ciclo de vida son distintos (una envuelve un stream de Anthropic con `TransformStream` + cleanup; la otra construye un `ReadableStream` finito a partir de un resultado). El helper puro `encodeEvent` cubre la duplicación real.
- No convertir `classifyAndExecute` en una tabla de "handlers" declarativa. La cascada `mode → ranges → salary → general` tiene orden significativo (mode override gana siempre, ranges antes de la clasificación heurística) y una tabla lo oscurecería. Se limpia extrayendo el ensamblado de input a helpers pequeños.
- No abstraer un `SSEEvent` type + registry. El protocolo tiene 4 eventos y evoluciona lento; sobre-abstraer aquí genera fricción sin ROI.
- No crear `http/index.ts`/`sse/index.ts`/`routing/index.ts` como barrels internos. Los consumidores externos usan el barrel `handlers.ts` o imports directos; añadir barrels intermedios sólo añade ruido.

---

## 5. Propuesta de reorganización

### 5.1 Archivos y responsabilidades

| Archivo | Contiene | Razón de existir |
|---|---|---|
| `http/request-validator.ts` | `ValidationResult`, `validateChatRequest`, `parseRequestBody` | Cambia cuando cambia el contrato de entrada del endpoint. |
| `http/auth.ts` | `extractUserIdFromRequest` | Cambia cuando cambia el mecanismo de auth (formato de token, header). |
| `http/error-response.ts` | `ChatHandlerResponse` (type), `buildErrorResponse` | Cambia cuando cambia la shape de error JSON del endpoint. |
| `http/result-mapper.ts` | `mapResultToHttpResponse`, `buildMetadata`, `ChatUseCaseResult` (type re-export) | Cambia cuando cambia el mapeo `result.type → status/body` o la shape de metadata. |
| `sse/sse-encoder.ts` | `encodeEvent(type, payload)`, `encodeDone(metadata)` (helpers puros con `TextEncoder` compartido) | Cambia cuando cambia el protocolo SSE al front. Testable sin streams. |
| `sse/status-stream.ts` | `buildStatusStreamResponse` | Cambia cuando cambia cómo se serializa un estado especial (`incomplete`/`invalid`/`conflicting`) como SSE. |
| `sse/anthropic-stream.ts` | `handleStreamResponse` | Cambia cuando cambia cómo se transforma el stream de Anthropic en SSE + cleanup fire-and-forget. |
| `routing/ranges-transformer.ts` | `transformRangesRequest` + patrones de categoría | Cambia con la heurística de reescritura de "ver rangos". |
| `routing/use-case-router.ts` | `classifyAndExecute` (+ helpers privados `buildSalaryInput`, `buildAskQuestionInput`) | Cambia cuando cambia la política de routing entre use cases o el contrato de input de éstos. |
| `handlers.ts` (barrel) | `export { ... } from "./http/..."`, etc. Sin lógica. | Preserva la API pública que consume `chat/index.ts`. |

### 5.2 Notas de diseño puntuales

- **`sse/sse-encoder.ts`** — expone dos helpers puros: `encodeEvent(type, payload): Uint8Array` (usa un `TextEncoder` interno) y una función `sseHeaders(base): Record<string, string>` opcional para consolidar los headers `Content-Type: text/event-stream` + `Cache-Control: no-cache` + `Connection: keep-alive` (hoy viven en `chat/index.ts`; se pueden dejar donde están si no se quiere ampliar el alcance del refactor).
- **`routing/use-case-router.ts`** — la duplicación de construcción de input entre ramas salary y ask-question se resuelve con dos helpers privados:
  ```ts
  function buildSalaryInput(request: ChatRequest, userId: string) { ... }
  function buildAskQuestionInput(request: ChatRequest, userId: string, preguntaOverride?: string) { ... }
  ```
  El cast a `Record<string, string | number | undefined>` queda en un único sitio.
- **`http/result-mapper.ts`** — `buildMetadata` es helper privado del módulo (no se exporta). `ChatUseCaseResult` se re-exporta como conveniencia porque `mapResultToHttpResponse` lo consume; su definición canónica (unión de `AskQuestionResult | CalculateSalaryResult`) puede vivir aquí o promoverse a `types.ts` compartido. **Recomendación:** dejarla en `result-mapper.ts` — es donde se usa el discriminante.
- **`handlers.ts` barrel** — export list literal:
  ```ts
  export { validateChatRequest, parseRequestBody, type ValidationResult } from "./http/request-validator.ts";
  export { extractUserIdFromRequest } from "./http/auth.ts";
  export { buildErrorResponse, type ChatHandlerResponse } from "./http/error-response.ts";
  export { mapResultToHttpResponse, type ChatUseCaseResult } from "./http/result-mapper.ts";
  export { buildStatusStreamResponse } from "./sse/status-stream.ts";
  export { handleStreamResponse } from "./sse/anthropic-stream.ts";
  export { classifyAndExecute } from "./routing/use-case-router.ts";
  ```
  Esta lista **es** la API pública actual de `handlers.ts` — comprobada contra el import de `supabase/functions/chat/index.ts` (líneas 5–14).

---

## 6. Plan de ejecución por commits atómicos

Cada paso es reversible por sí mismo. `pnpm test:deno` y `pnpm typecheck` deben pasar tras cada commit. Cada `mkdir` es lógico; en Deno basta con crear el archivo con la ruta deseada.

### Paso 1 — Extraer capa HTTP
1. Crear `http/request-validator.ts` con `validateChatRequest`, `parseRequestBody` y `ValidationResult`.
2. Crear `http/auth.ts` con `extractUserIdFromRequest`.
3. Crear `http/error-response.ts` con `buildErrorResponse` y `ChatHandlerResponse`.
4. Crear `http/result-mapper.ts` con `mapResultToHttpResponse`, `buildMetadata` (privado) y `ChatUseCaseResult`.
5. Reemplazar el contenido de `handlers.ts` por re-exports desde los 4 módulos + dejar temporalmente el resto del código (routing + SSE) tal cual, importando lo necesario si aplica.
6. Borrar `processChatRequest` (código muerto §3.4).
7. `pnpm test:deno` + `pnpm typecheck` verdes.
8. **Commit:** `refactor(chat): extract http layer from handlers`.

### Paso 2 — Extraer capa SSE
1. Crear `sse/sse-encoder.ts` con `encodeEvent(type, payload)` puro (usa `TextEncoder` interno).
2. Crear `sse/status-stream.ts` con `buildStatusStreamResponse` reescrito para consumir `encodeEvent`. Comportamiento idéntico: mismos 4 tipos de evento (`status`, `text`, `citation`, `done`), mismo orden, mismas condiciones (`shouldEmitCitations`, omisión de `text` en `incomplete`).
3. Crear `sse/anthropic-stream.ts` con `handleStreamResponse` reescrito para consumir `encodeEvent`. Se preserva `TransformStream` + `TextDecoder` + `cleanup(fullResponse).catch(...)`.
4. Ajustar el barrel `handlers.ts` para re-exportar desde `sse/*`.
5. Verificar manualmente (o con tests) que los eventos emitidos son byte-a-byte equivalentes a los actuales — es un cambio delicado (el front parsea SSE con expectativas exactas).
6. `pnpm test:deno` + `pnpm typecheck` verdes.
7. **Commit:** `refactor(chat): extract sse layer from handlers`.

### Paso 3 — Extraer capa routing
1. Crear `routing/ranges-transformer.ts` con `transformRangesRequest` y sus patrones internos.
2. Crear `routing/use-case-router.ts` con `classifyAndExecute` reescrito usando helpers privados `buildSalaryInput`/`buildAskQuestionInput` para desduplicar el ensamblado de input.
3. Ajustar el barrel `handlers.ts` para re-exportar `classifyAndExecute` desde `routing/`.
4. En este punto `handlers.ts` es un fichero de sólo re-exports (~15 líneas).
5. `pnpm test:deno` + `pnpm typecheck` verdes.
6. **Commit:** `refactor(chat): extract routing layer from handlers`.

### Paso 4 — Verificación final y limpieza
1. Ejecutar `pnpm typecheck` + `pnpm test:deno` + `pnpm build` completos.
2. Confirmar tamaños:
   - Ningún archivo nuevo > 120 líneas.
   - `handlers.ts` como barrel < 20 líneas.
3. Confirmar que `supabase/functions/chat/index.ts` sigue importando desde `../_shared/core/chat/handlers.ts` sin cambios.
4. `grep` en el repo para verificar que ningún otro fichero importaba símbolos de `handlers.ts` que hayan quedado sin re-exportar.
5. **Commit:** `chore(chat): final cleanup and size checks for handlers refactor`.

---

## 7. Riesgos y notas de ejecución

- **SSE byte-a-byte:** los eventos que emite el backend son consumidos por `useChatStream.ts` en el front, que parsea los `data: ${json}\n\n` línea a línea. Cualquier cambio accidental de espacios, orden de claves en el JSON, o falta de `\n\n` final rompe el front en silencio. En el paso 2, revisar que `encodeEvent` produzca **exactamente** el mismo output que las plantillas manuales actuales. Consideración: si se usa `JSON.stringify({ type, ...payload })`, el orden de claves depende del orden de spread; replicar el orden actual (`type` primero, resto después).
- **Code muerto (`processChatRequest`):** confirmado con `Grep` — no hay imports fuera del propio módulo. Se elimina en el paso 1.
- **`ChatUseCaseResult`:** hoy se define en `handlers.ts` línea 141. Al moverlo a `http/result-mapper.ts` cualquier otro fichero que lo importe (comprobar con `Grep`) debe seguir funcionando gracias al re-export del barrel.
- **`chat/index.ts` no debería tocarse.** Es el criterio de éxito principal: el consumidor externo del módulo no cambia. Si alguna migración fuerza un cambio ahí, revisar el barrel antes.
- **Tests existentes:** los tests actuales de `handlers.test.ts` (si existen) siguen importando desde `./handlers.ts`. El barrel mantiene la compat. Cuando estabilice, considerar un PR posterior que mueva cada test junto a su módulo (`http/request-validator.test.ts`, etc.), pero **no en este refactor**.
- **Deno + extensiones `.ts`:** obligatorias en imports.
- **No dividir más.** No extraer `sseHeaders` a `sse-encoder.ts` en este PR — hoy viven en `chat/index.ts` y moverlas amplía el scope. Dejarlo como follow-up si molesta.

---

## 8. Checklist de validación post-refactor

- [ ] `pnpm test:deno` verde sin modificar assertions salvo actualizaciones de path (`./handlers.ts` sigue existiendo como barrel).
- [ ] `pnpm typecheck` y `pnpm build` sin errores.
- [ ] `supabase/functions/chat/index.ts` intacto (mismo import, mismos símbolos).
- [ ] `handlers.ts` es un barrel < 20 líneas, cero lógica.
- [ ] Ningún archivo nuevo en `http/`, `sse/`, `routing/` supera 120 líneas.
- [ ] `processChatRequest` eliminado.
- [ ] Ningún archivo mezcla validación HTTP con serialización SSE con routing.
- [ ] Cada archivo puede describirse en una frase sin usar "y".
- [ ] Un evento SSE emitido por el nuevo `sse/anthropic-stream.ts` es byte-a-byte idéntico al emitido por el `handlers.ts` actual para el mismo input (verificación manual con `curl -N` o test dedicado).

---

## 9. Próximo paso recomendado

Ejecutar el **Paso 1** (extracción de la capa HTTP). Es el más mecánico y el que menos riesgo tiene: son funciones puras o casi puras, sin streams involucrados. Deja el terreno limpio para atacar el paso 2 (SSE), que es el que requiere más cuidado por la sensibilidad byte-a-byte del protocolo.

Con este PR se cierra el bloque backend de la auditoría `001-srp-audit.md` (violaciones 🔴 #1, #2, #3). Quedaría pendiente sólo el bloque frontend (#4–#7): `ChatPage.tsx`, `useChatPage.ts`, `useChatStream.ts` y `lib/chat-api.ts`.
