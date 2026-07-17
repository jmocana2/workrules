# Análisis SRP — `useChatPage.ts`

**Fecha:** 2026-07-17
**Archivo:** `src/ui/components/workrules/pages/ChatPage/useChatPage.ts` (1.052 líneas)
**Paradigma:** React 19 (custom hook)
**Skill aplicada:** `.agents/skills/single-responsibility/SKILL.md`
**Contexto previo:**
- [`001-srp-audit.md`](./001-srp-audit.md) — auditoría original (violación 🔴 #5).
- [`005-chatpage-srp.md`](./005-chatpage-srp.md) — refactor previo de `ChatPage.tsx`, ya cerrado. `ChatPage.tsx` es hoy un orquestador de columnas que **consume** `useChatPage`; el mega-hook quedó explícitamente fuera de aquel PR y se ataca aquí.

Este es el **segundo** archivo del bloque frontend. El audit original estimaba ">400 líneas"; la realidad es **1.052 líneas** — el archivo ha crecido desde entonces (data request, chips, salaryMode, resolvedVariables, integración con `useChatSessions`/`useConvenioVariables`, carga de sesiones históricas). Todo esto refuerza el diagnóstico del audit y agranda el ROI del refactor.

Los pasos siguientes del audit (`useChatStream.ts` #6, `chat-api.ts` #7) **no se abordan en este PR**. Se recogen en `TODO.md` junto con los ejes DRY/KISS/YAGNI y antipatrones, más una acción para valorar una nueva skill que cubra esos aspectos.

---

## 1. Test de las tres preguntas (skill SRP)

1. **Reasons to change** — describir el hook hoy obliga a decir:
   > "Gestiona el convenio seleccionado **y** decide entre el chat real (`useChatStream`) y el chat mock (`useChat` del AI SDK) **y** unifica ambos flujos de mensajes bajo un solo tipo `ChatMessage[]` **y** mapea 4 estados especiales del backend (`incomplete`, `invalid`, `smi_alert`, `conflicting`) a `alertState` / `dataRequestState` **y** clasifica variables identificadoras vs moduladoras con una lista de keywords **y** humaniza labels de variables **y** construye prompts sintéticos para el modo salario **y** gestiona chips de variables activas (`activeVariables`) **y** mergea `resolvedVariables` que devuelve el backend **y** crea sesiones nuevas (`createChatSession`) al primer mensaje **y** carga sesiones históricas (`loadChatSessionMessages` + `getConvenioIdForSession` + `getConvenioById`) **y** hace auto-scroll **y** parsea citaciones markdown en modo mock **y** gestiona el input local controlado **y** gestiona el toggle de `salaryMode` **y** gestiona los toggles de sidebar/variables panel colapsados **y** carga perfil mock por dynamic import **y** limpia estado al cambiar de convenio **y** re-envía la última pregunta tras un DataRequestCard **y** construye respuestas de fallback ('No lo sé' → pedir opciones al backend)."
   → **19 "y"**. Falla catastróficamente.

2. **Audience of change** — al menos 5 audiencias distintas tocan este hook:
   - **Integración chat real** — `useChatStream`, sessionId, `createChatSession`, `resolvedVariables`, historial cross-turno.
   - **Integración chat mock (Storybook/dev)** — `useChat` del AI SDK, parsing markdown de citaciones, dynamic imports de mocks.
   - **Protocolo de estados** — mapping de `incomplete`/`invalid`/`smi_alert`/`conflicting` a `alertState`/`dataRequestState`.
   - **Dominio variables** — chips activos, keywords identificadoras, humanización de labels, prompt sintético modo salario.
   - **UI/estado de página** — colapsados de paneles, input controlado, auto-scroll, refs, toggle salaryMode.

   Falla.

3. **Test isolation** — hoy, testear el flujo de `handleSpecialState` obliga a construir todo `useChatPage`, que a su vez pincha `useChatStream`, `useChat` del AI SDK, `useSupabase`, `useRepositories`, `useChatSessions` y `useConvenioVariables`. Testear la clasificación de variables identificadoras requiere lo mismo, cuando debería ser un test unitario de una función pura. Testear que el chip se merge cuando llega `resolvedVariables` requiere ejecutar todo el pipeline real. **Cada responsabilidad tiene un perfil de test radicalmente distinto y sólo puede tocarse arrastrando todo el hook**. Falla.

Los tres tests fallan → procede refactor.

---

## 2. Mapa de responsabilidades actuales

| Bloque | Líneas | Responsabilidad | ¿Puro? | Dependencias externas |
|---|---|---|---|---|
| Imports | 1–48 | Dependencias del hook | — | 8+ hooks, 4 use cases |
| `isIdentifyingVariable` | 59–84 | Regla de dominio: clasifica variables identificadoras vs moduladoras vía keywords normalizadas | ✅ | — |
| `humanizeVariableLabel` | 90–93 | Formato de label: `tipo_establecimiento` → `Tipo establecimiento` | ✅ | — |
| `buildSyntheticPrompt` | 99–107 | Construye prompt sintético para modo salario cuando no hay texto | ✅ | — |
| `USE_MOCK_API` flag | 110 | Bandera de entorno | ✅ | `import.meta.env` |
| Data fetching (user, repos, conversations) | 136–150 | Consumo de hooks de infraestructura | ❌ | `useSupabase`, `useRepositories`, `useChatSessions`, `useConvenioVariables` |
| `getMessageText` | 152–166 | Extractor de contenido de `UIMessage` (parts + legacy `content`) | ✅ | — |
| Refs (input, messagesEnd) | 169–170 | Refs de DOM para foco y auto-scroll | — | React |
| `state: ChatPageState` + derivados | 172–226 | Estado agregado: convenio, perfil, colapsados, conversations, sessionId, mockCitations, alertState, dataRequestState, localInput, activeVariables, salaryMode | ❌ | React state |
| `hasIdentifyingVariables` (memo) | 229–232 | Derivado de `activeVariables` | ✅ | — |
| `handleSpecialState` | 237–364 | **Mapping backend → UI de 4 estados del protocolo** (incomplete, invalid, smi_alert, conflicting) | ❌ (accede a `state.selectedConvenio` para el label) | `parseDataRequestEvent`, `humanizeVariableLabel`, `isIdentifyingVariable` |
| `realChat = useChatStream(...)` | 366–379 | Configuración del chat real + callbacks (`onSpecialState`, `onError`, `onResolvedVariables`) | ❌ | `useChatStream` |
| `mockChat = useChat(...)` | 384–388 | Configuración del chat mock del AI SDK | ❌ | `useChat`, `DefaultChatTransport` |
| `mockMessages` (memo) | 391–402 | Transformación de mensajes del AI SDK → `ChatMessage[]` | ✅ | `getMessageText` |
| `buildPdfHref` | 408–414 | Helper URL PDF con `#page=N` | ✅ | — |
| `realMessages` (memo) | 415–433 | Transformación de mensajes de `useChatStream` → `ChatMessage[]` | ✅ | `buildPdfHref` |
| Selector real/mock (messages, isLoading, error, citations) | 438–451 | Unificación de fuente según `shouldUseMocks` | ✅ | — |
| Parseo citaciones markdown (modo mock) | 454–477 | Extrae `[texto](url)` del último mensaje asistente en mock | ❌ (efecto) | — |
| Carga convenio inicial (mock) | 480–496 | Dynamic import de `MOCK_PERFIL_HOSTELERIA` | ❌ | dynamic import |
| Auto-scroll | 499–501 | `scrollIntoView` al llegar mensaje | ❌ | React ref |
| `selectConvenio` | 509–545 | Cambio de convenio + limpieza de estado condicional | ❌ | state setters + dynamic import mock |
| `clearConvenio` | 550–565 | Limpiar convenio y estado dependiente | ❌ | state setters |
| `handleVariableClick` / `handleVariableRemove` | 569–590 | Toggle chip por nombre (sobrescribe por grupo) | ✅ | React state |
| `handleInputChange` / `setInput` | 593–598, 810–812 | Input controlado | ✅ | React state |
| `handleSubmitFromText` | 601–683 | **Orquestación de envío**: valida convenio, construye prompt sintético si aplica, crea sesión si es el 1er msg, resetea citaciones/alertas, delega a `realSendMessage`/`mockSendMessage` | ❌ | `createChatSession`, ambos chats |
| `handleSubmit` | 686–692 | Wrapper para submit de formulario | ✅ | — |
| `handleNewConversation` | 695–715 | Reset completo (mensajes, sesión, alertas, chips, mode, convenio) | ❌ | state setters |
| `handleSelectConversation` | 718–786 | **Carga de sesión histórica**: recupera convenioId de sesión, mensajes, y convenio; en mock carga `MOCK_CHAT_MESSAGES` | ❌ | 3 use cases + dynamic import |
| `handleOpenSettings` | 789–791 | Stub | ✅ | — |
| `toggleVariablesPanel` / `toggleSidebar` | 794–807 | Toggles de colapso | ✅ | React state |
| Handlers de alertas (Estados D/E/F) | 821–870 | `dismiss`, `invalidDataSuggestion`, `conflictOption`, `SMIViewDetails`, `setAlert` | ❌ (algunos envían mensajes) | state setters + `realSendMessage`/`mockSendMessage` |
| Handlers de DataRequest (Estado B) | 880–993 | `submit` (merge chips + re-envío pregunta), `skip` (pedir opciones al backend con detección de categoría), `setDataRequest` | ❌ | `realSendMessage`/`mockSendMessage`, `messages` |
| `return` público | 995–1051 | Retorno agregado (34 propiedades) | — | — |

**Observaciones:**
- El hook mezcla **4 dominios distintos** en un único `useState`/`useCallback` en serie: sesiones (sessionId + carga histórica), convenio (selectedConvenio + perfilJson), variables (activeVariables + chips), y protocolo (alertState + dataRequestState).
- El **switch real/mock** está esparcido en 8+ sitios (`selectConvenio`, `clearConvenio`, `handleSubmitFromText`, `handleNewConversation`, `handleSelectConversation`, `handleConflictOption`, `handleDataRequestSubmit`, `handleDataRequestSkip`). Cada uno hace `if (useMocks) { ... } else { ... }`. Es un candidato claro a **estrategia inyectada** en lugar de branching duplicado.
- `handleSpecialState` (128 líneas) es el bloque más grande y el que más audiencia tiene (protocolo). Es también el único con un test unitario natural obvio: transformar un evento del backend en un `alertState` o `dataRequestState`.
- Las 3 funciones puras del top del archivo (`isIdentifyingVariable`, `humanizeVariableLabel`, `buildSyntheticPrompt`) son helpers de dominio que ya están extraídos de facto — sólo hay que moverlos a su propio archivo.
- El destructuring del retorno en `ChatPage.tsx` toca **34 propiedades**. Ese ruido es sintomático de que el hook expone 5 sub-APIs mezcladas.
- **Contrato con `ChatPage.tsx`**: el refactor debe mantener el retorno actual sin cambios (los 34 campos), porque `ChatPage.tsx` los consume y los distribuye a las 3 columnas extraídas en el doc 005.

---

## 3. Violaciones críticas SRP

### 🔴 3.1 `handleSpecialState` mapea 4 protocolos distintos en un switch de 128 líneas
Cada `case` (`incomplete`, `invalid`, `smi_alert`, `conflicting`) tiene su propio parsing de payload backend, sus propias reglas de dominio (p.ej. filtrar por `isIdentifyingVariable` sólo en `incomplete`), y su propio target de estado (`dataRequestState` vs `alertState`). Añadir un nuevo estado del protocolo obliga a abrir este hook y editar el switch. Es una función pura mal ubicada — no depende de nada del hook salvo del label del convenio, que es un parámetro claro.

### 🔴 3.2 Duplicación del branching `useMocks` en 8+ handlers
El patrón `if (useMocks) { mockSendMessage(...) } else { realSendMessage(...) }` (o el equivalente con `mockSetMessages`/`realSetMessages`, `mockSetMessages([])`/`realClearMessages()`) aparece repetidamente. La duplicación no es sólo cosmética: **cada nuevo handler debe recordar el branching**, y cualquier cambio en la firma de `realSendMessage` (que ya tiene 5 parámetros posicionales incluyendo `replayLastUser` y `mode`) fuerza tocar todos los sitios.

### 🔴 3.3 `useChatPage` mezcla **integración de streaming** + **carga de sesiones** + **gestión de variables** + **gestión de protocolo** + **estado de UI**
Cinco sub-hooks se pueden identificar sin esfuerzo:
- `useChatIntegration` — real/mock, unificación de mensajes, sendMessage, isLoading.
- `useChatSessionLifecycle` — sessionId, `createChatSession`, `handleSelectConversation`, `handleNewConversation`.
- `useVariableChips` — `activeVariables`, `handleVariableClick`, `handleVariableRemove`, `hasIdentifyingVariables`.
- `useProtocolState` — `alertState` + `dataRequestState` + `handleSpecialState` + los 7 handlers de alertas/dataRequest.
- Estado UI residual — `isVariablesPanelCollapsed`, `isSidebarCollapsed`, `localInput`, refs.

Todos comparten un vínculo real: al enviar un mensaje se resetean citaciones/alertas/dataRequest y se pueden crear sesiones. Ese vínculo se resuelve con **composición explícita** en el hook raíz.

### 🟡 3.4 Helpers puros de dominio viven dentro del archivo del hook
`isIdentifyingVariable`, `humanizeVariableLabel`, `buildSyntheticPrompt`, `getMessageText`, `buildPdfHref` son funciones sin estado. Vivir dentro del archivo del hook las hace difíciles de testear en aislamiento y confunde el diff cuando el hook cambia.

### 🟡 3.5 `handleSelectConversation` orquesta 3 use cases + dynamic import + reset de estado
Es una función de 68 líneas que hace: reset chips/mode → set currentConversationId → si mock, cargar `MOCK_CHAT_MESSAGES`; si real, llamar `getConvenioIdForSession` → `loadChatSessionMessages` → `realSetMessages` → `setSessionId` → `getConvenioById` → `setState`. Es un caso de uso de aplicación, no un handler UI. Debería vivir como función testeable (`loadSessionIntoChat`) con sus dependencias inyectadas y ser consumida por el sub-hook de sesiones.

### 🟡 3.6 `handleDataRequestSubmit` y `handleDataRequestSkip` ejecutan lógica de dominio (detección de categoría, merge de chips, re-envío)
`handleDataRequestSkip` incluso tiene una lista hardcodeada de categorías profesionales (`ayudante de cocina`, `camarero`, …) para construir el prompt de fallback. Eso es una regla de dominio disfrazada de handler. Puede aislarse como `buildFallbackOptionsPrompt(lastUserMessage)`.

### 🟡 3.7 El `return` expone 34 campos planos sin agrupación
El destructuring en `ChatPage.tsx` es enorme y no separa audiencias. Se puede exponer el mismo shape (por compat) pero construirlo desde los sub-hooks para que cada uno tenga un contrato explícito.

---

## 4. Estrategia

Dividir el hook en **4 sub-hooks + 1 módulo de helpers puros + 1 módulo con el mapper del protocolo**. `useChatPage` queda como orquestador: llama a los sub-hooks en orden, cablea callbacks entre ellos (p.ej. `onFinish` de streaming resetea `dataRequestState`) y compone el retorno público **manteniendo la firma actual**.

Otra decisión clave: **la unificación real/mock se encapsula en `useChatIntegration`**. Ese hook expone una única API (`messages`, `isLoading`, `error`, `citations`, `sendMessage`, `setMessages`, `clearMessages`) sin que el resto del código sepa si por debajo hay `useChatStream` o `useChat`. El branching queda contenido en un sitio, no esparcido en 8.

### 4.1 Estructura objetivo

```
src/ui/components/workrules/pages/ChatPage/
├── ChatPage.tsx                    # (sin cambios en este PR — sigue destructurando los 34 campos)
├── ChatPage.types.ts               # (sin cambios)
├── useChatPage.ts                  # orquestador — ~150 líneas
├── parseAlertEvent.ts              # (sin cambios)
├── components/                     # (sin cambios — refactor 005)
├── hooks/                          # (sin cambios — refactor 005)
├── helpers/                        # (existente del refactor 005)
│   ├── emptyState.ts               # (sin cambios)
│   ├── canSubmit.ts                # (sin cambios)
│   ├── normalizeUserPlan.ts        # (sin cambios)
│   ├── variableClassification.ts   # NUEVO — isIdentifyingVariable + humanizeVariableLabel
│   ├── syntheticPrompt.ts          # NUEVO — buildSyntheticPrompt + buildFallbackOptionsPrompt
│   ├── messageAdapters.ts          # NUEVO — getMessageText + buildPdfHref + toChatMessage
│   └── specialStateMapper.ts       # NUEVO — mapSpecialStateToUi (mapper puro del protocolo)
├── useChatPage/                    # NUEVO — sub-hooks
│   ├── useChatIntegration.ts       # real vs mock unificado
│   ├── useChatSessionLifecycle.ts  # sessionId + createChatSession + handleSelectConversation
│   ├── useVariableChips.ts         # activeVariables + click/remove + hasIdentifyingVariables
│   └── useProtocolState.ts         # alertState + dataRequestState + 7 handlers
```

### 4.2 Reglas que aplicamos
- Cada sub-hook debe poder describir su responsabilidad en una frase sin "y".
- **Contrato público invariante**: `useChatPage` sigue devolviendo los mismos 34 campos con los mismos tipos. `ChatPage.tsx` **no se toca** en este PR.
- `handleSpecialState` se extrae como **función pura** `mapSpecialStateToUi(event, ctx) → { alert?: AlertState; dataRequest?: DataRequestState }`. El sub-hook `useProtocolState` la usa para actualizar estado. Así el mapper es 100% testeable con snapshots.
- La estrategia real/mock se resuelve **con inyección**, no con branching duplicado. `useChatIntegration({ mode: 'real' | 'mock', ... })` decide una sola vez qué implementación construye y expone una API común.
- Los tests existentes (`useChatPage.integration.test.tsx`) deben pasar sin modificar assertions. Se **añaden** nuevos tests unitarios para: `mapSpecialStateToUi`, `variableClassification`, `syntheticPrompt`, `messageAdapters`, y cada sub-hook con `renderHook`.
- Ningún archivo nuevo debe superar ~200 líneas. `useChatPage.ts` debe quedar bajo 150.
- **No** cambiamos la firma de `useChatStream` ni de `chat-api.ts`. Esos son los siguientes pasos (#6 y #7 del audit) y están registrados en `TODO.md`.

### 4.3 Qué NO extraer (aún)
- **No** dividir `useChatStream` ni `chat-api.ts`. Es el paso siguiente. Este PR sólo los **consume** vía `useChatIntegration`.
- **No** modificar `ChatPage.tsx`. Recibir los sub-hooks fusionados en el retorno mantiene compatibilidad; una migración a API agrupada (`{ session, variables, protocol, integration, ui }`) sería otro refactor con impacto en las columnas.
- **No** introducir un store global (Zustand) para el estado del chat. El acoplamiento actual entre sub-hooks es explícito y contenido; un store añadiría magia global sin resolver el problema real (mezcla de audiencias).
- **No** promover los helpers de dominio (`variableClassification`, `specialStateMapper`) a `@core/`. Son específicos de la UI de chat y del contrato con este backend. Si en el futuro otro cliente los necesita, se elevan.
- **No** eliminar la lista hardcodeada de categorías profesionales en `handleDataRequestSkip`. Es una heurística que hoy funciona y su mejora (llamar al backend por opciones sin el hint) es un cambio funcional, no de SRP.

---

## 5. Propuesta de reorganización

### 5.1 Archivos y responsabilidades

| Archivo | Contiene | Razón de existir |
|---|---|---|
| `helpers/variableClassification.ts` | `isIdentifyingVariable(name)` + `humanizeVariableLabel(name)`. Sin estado. | Cambia con la lista de keywords identificadoras o con el formato de labels. |
| `helpers/syntheticPrompt.ts` | `buildSyntheticPrompt(variables, humanize)` + `buildFallbackOptionsPrompt(lastUserMessage, categoriasConocidas)`. Sin estado. | Cambia con el copy del prompt sintético o la heurística de detección de categoría. |
| `helpers/messageAdapters.ts` | `getMessageText(UIMessage)` + `buildPdfHref(url, page)` + `toChatMessage(realChatMessage)`. Sin estado. | Cambia con el shape de mensajes del AI SDK o de `useChatStream`. |
| `helpers/specialStateMapper.ts` | `mapSpecialStateToUi(event, ctx) → { alert?, dataRequest? }`. Pura. `ctx` incluye `selectedConvenio` para el label y `humanize` para las variables. | Cambia con el protocolo backend (nuevos estados o payloads). |
| `useChatPage/useChatIntegration.ts` | Encapsula el switch real/mock. Firma: `useChatIntegration({ mode, convenioId, sessionId, callbacks }) → { messages, isLoading, error, citations, sendMessage, setMessages, clearMessages }`. | Cambia con la estrategia de fuente (real/mock/futuro tercer transport). |
| `useChatPage/useChatSessionLifecycle.ts` | `sessionId`, `createSession(firstMessage)`, `loadSession(id)`, `resetSession()`. Consume `chatSessionRepo` y `convenioRepo` inyectados. | Cambia con el ciclo de vida de sesiones (persistencia, hidratación histórica). |
| `useChatPage/useVariableChips.ts` | `activeVariables`, `handleVariableClick`, `handleVariableRemove`, `mergeResolvedVariables`, `hasIdentifyingVariables`, `clear()`. | Cambia con las reglas de chips. |
| `useChatPage/useProtocolState.ts` | `alertState`, `dataRequestState`, `handleSpecialState`, los 5 handlers de alertas y los 3 de dataRequest. Recibe `sendMessage` y `messages` por props. | Cambia con el protocolo de estados y sus flujos de respuesta. |
| `useChatPage.ts` | Orquestador: consume los 4 sub-hooks + estado UI residual (input, colapsados, refs, salaryMode, selectedConvenio, perfilJson). Compone el retorno de 34 campos. | Cambia con la topología del chat. |

### 5.2 Notas de diseño puntuales

- **`useChatIntegration`** firma:
  ```ts
  useChatIntegration({
    mode: 'real' | 'mock',
    convenioId: string | null,
    sessionId: string | null,
    onSpecialState: (state) => void,
    onResolvedVariables: (vars) => void,
    onError: (err) => void,
  }): {
    messages: ChatMessage[];
    isLoading: boolean;
    error: Error | null;
    citations: Citation[];
    sendMessage: (text, opts?) => Promise<void>;
    setMessages: (msgs: ChatMessage[]) => void;
    clearMessages: () => void;
  }
  ```
  Internamente llama **ambos** hooks (`useChatStream` y `useChat`) pero sólo expone el activo según `mode`. React exige llamar hooks incondicionalmente, así que ambos se llaman siempre (el mock queda inactivo si no hay mensajes → no hace fetch). Alternativa: elevar la decisión a `ChatPage.tsx` con `useMockChatPage` vs `useRealChatPage` — descartada porque duplica el resto del hook.

- **`useChatSessionLifecycle`** firma:
  ```ts
  useChatSessionLifecycle({
    userId: string | null,
    chatSessionRepo, convenioRepo,
    onSessionLoaded: (msgs, convenio) => void,   // llama a setMessages + selectConvenio
    onSessionReset: () => void,
  }): {
    sessionId: string | null,
    createSessionIfNeeded: (convenioId, firstMessage) => Promise<string | null>,
    loadSession: (sessionId) => Promise<void>,
    resetSession: () => void,
  }
  ```

- **`useProtocolState`** firma:
  ```ts
  useProtocolState({
    sendMessage,
    getMessages: () => ChatMessage[],  // para acceder al último user message
    mergeVariables: (vars) => void,     // callback a useVariableChips
    onDismissDataRequest: () => void,
    selectedConvenio,
    humanize,
  }): {
    alertState, dataRequestState,
    handleSpecialState,
    handleAlertDismiss, handleInvalidDataSuggestion, handleConflictOption, handleSMIViewDetails, setAlert,
    handleDataRequestSubmit, handleDataRequestSkip, setDataRequest,
  }
  ```

- **`mapSpecialStateToUi`** — función pura, sin React, con firma:
  ```ts
  type Ctx = {
    selectedConvenio: Convenio | null,
    humanize: (name: string) => string,
    isIdentifying: (name: string) => boolean,
  };
  function mapSpecialStateToUi(event: SpecialStateEvent, ctx: Ctx):
    { alert?: AlertState; dataRequest?: DataRequestState } | null;
  ```
  Los tests unitarios cubren los 4 casos + el edge case "todas las variables faltantes son moduladoras → no dataRequest".

- **Estado UI residual en `useChatPage`**: `selectedConvenio`, `perfilJson`, `isVariablesPanelCollapsed`, `isSidebarCollapsed`, `localInput`, `salaryMode`, `inputRef`, `messagesEndRef`, `selectedConvenioId`. No merecen un sub-hook — son estado atómico simple.

- **Retorno público**: se construye a mano juntando los sub-hooks. Se añade un test que compara el shape del retorno contra el `UseChatPageReturn` para no romper el contrato.

---

## 6. Plan de ejecución por commits atómicos

Cada paso es reversible. `pnpm typecheck`, `pnpm lint` y los tests unitarios existentes deben pasar tras cada commit. Playwright se ejecuta al final.

### Paso 1 — Extraer helpers puros
1. Crear `helpers/variableClassification.ts` con `isIdentifyingVariable` + `humanizeVariableLabel`.
2. Crear `helpers/syntheticPrompt.ts` con `buildSyntheticPrompt` y `buildFallbackOptionsPrompt` (extraído de `handleDataRequestSkip`).
3. Crear `helpers/messageAdapters.ts` con `getMessageText`, `buildPdfHref`, `toChatMessage`.
4. En `useChatPage.ts`: importar y eliminar definiciones locales.
5. Añadir tests unitarios: `variableClassification.test.ts`, `syntheticPrompt.test.ts`, `messageAdapters.test.ts`.
6. `pnpm typecheck` + `pnpm lint` + tests verdes.
7. **Commit:** `refactor(chat-page): extract pure helpers (variables, prompts, message adapters)`.

### Paso 2 — Extraer `mapSpecialStateToUi`
1. Crear `helpers/specialStateMapper.ts` con `mapSpecialStateToUi(event, ctx)`.
2. En `useChatPage.ts`: `handleSpecialState` pasa a llamar el mapper y aplicar los setters.
3. Añadir `specialStateMapper.test.ts` con casos: `incomplete` con identificadoras, `incomplete` sólo moduladoras (null), `invalid` con `invalidVariables[0]`, `invalid` sin `invalidVariables` (null), `smi_alert`, `conflicting` con ≥2 variables, `conflicting` con <2 (null).
4. `pnpm typecheck` + tests verdes.
5. **Commit:** `refactor(chat-page): extract mapSpecialStateToUi pure mapper`.

### Paso 3 — Extraer `useVariableChips`
1. Crear `useChatPage/useVariableChips.ts` con `activeVariables`, `handleVariableClick`, `handleVariableRemove`, `mergeResolvedVariables`, `hasIdentifyingVariables`, `clear()`.
2. En `useChatPage.ts`: reemplazar los `useState`/`useMemo`/`useCallback` correspondientes por la llamada al sub-hook.
3. Añadir `useVariableChips.test.tsx` con `renderHook`.
4. `pnpm typecheck` + tests verdes.
5. **Commit:** `refactor(chat-page): extract useVariableChips sub-hook`.

### Paso 4 — Extraer `useProtocolState`
1. Crear `useChatPage/useProtocolState.ts` con `alertState`, `dataRequestState`, `handleSpecialState` (usando el mapper), y los 7 handlers.
2. Recibe callbacks `sendMessage`, `getMessages`, `mergeVariables`, `selectedConvenio`, `humanize`.
3. En `useChatPage.ts`: consumir el sub-hook. Ojo con el orden — necesita `sendMessage` que hoy viene de `realChat`/`mockChat`. Solución: declarar `sendMessage` como un `useCallback` estable arriba del sub-hook, cableando la fuente.
4. Añadir `useProtocolState.test.tsx`.
5. `pnpm typecheck` + tests verdes.
6. **Commit:** `refactor(chat-page): extract useProtocolState sub-hook`.

### Paso 5 — Extraer `useChatIntegration`
1. Crear `useChatPage/useChatIntegration.ts` que encapsula el switch real/mock y expone la API común.
2. En `useChatPage.ts`: reemplazar `realChat` + `mockChat` + `messages`/`isLoading`/`error`/`citations`/`sendMessage` unificados por una única llamada al sub-hook.
3. Verificar que el efecto de parsing de citaciones markdown en modo mock queda dentro del sub-hook (es específico de mock).
4. Añadir `useChatIntegration.test.tsx` con casos real y mock (mockeando los hooks internos).
5. `pnpm typecheck` + tests unitarios verdes. **Verificar manualmente** en dev server con `VITE_USE_MOCKS=true` y sin él que el chat sigue funcionando en ambos modos.
6. **Commit:** `refactor(chat-page): extract useChatIntegration sub-hook`.

### Paso 6 — Extraer `useChatSessionLifecycle`
1. Crear `useChatPage/useChatSessionLifecycle.ts` con `sessionId`, `createSessionIfNeeded`, `loadSession`, `resetSession`.
2. En `useChatPage.ts`: reemplazar `sessionId` state + la creación en `handleSubmitFromText` + `handleSelectConversation` + reset en `handleNewConversation`.
3. Añadir `useChatSessionLifecycle.test.tsx` con mock de repos.
4. `pnpm typecheck` + tests verdes.
5. **Commit:** `refactor(chat-page): extract useChatSessionLifecycle sub-hook`.

### Paso 7 — Limpieza final del orquestador
1. Revisar `useChatPage.ts`: debe quedar ~150 líneas, básicamente estado UI atómico + `useCallback` de `handleSubmitFromText`/`handleNewConversation`/`selectConvenio`/`clearConvenio` que orquestan los sub-hooks + `return` de 34 campos.
2. Añadir un test que valide el shape del retorno (`expect(Object.keys(result.current).sort()).toEqual([...])`).
3. `pnpm typecheck` + `pnpm lint` + `pnpm test` (Playwright) + `pnpm build`.
4. Verificar manualmente en dev server: enviar mensaje, cambiar convenio, cargar sesión histórica del sidebar, click en variable, modo salario, respuesta a DataRequestCard, alerta SMI (si es reproducible), respuesta "no lo sé" en DataRequest.
5. **Commit:** `chore(chat-page): final cleanup and size checks for useChatPage refactor`.

---

## 7. Riesgos y notas de ejecución

- **Orden de dependencias entre sub-hooks:** `useProtocolState` necesita `sendMessage` de `useChatIntegration`. `useChatSessionLifecycle` necesita `setMessages` de `useChatIntegration`. `useChatIntegration` necesita `onSpecialState` de `useProtocolState` y `onResolvedVariables` de `useVariableChips`. Esta ciclicidad se rompe con **callbacks estables** (`useCallback` con deps mínimas) declarados en el orquestador antes de llamar al sub-hook consumidor. Ejemplo: declarar `mergeVariables` desde `useVariableChips` primero, luego construir `handleSpecialState` en `useProtocolState`, y pasar ambos como callbacks a `useChatIntegration`.
- **React exige llamar hooks incondicionalmente:** `useChatIntegration` debe llamar `useChatStream` **y** `useChat` siempre, aunque sólo exponga el activo según `mode`. Esto tiene un pequeño coste (el hook mock se instancia pero no hace fetch sin transporte real). Alternativa: separar en dos hooks y dejar que `useChatPage` decida cuál llamar — descartada porque introduce dos ramas en el orquestador que era exactamente lo que veníamos a eliminar.
- **Contrato invariante con `ChatPage.tsx`:** el retorno de 34 campos debe mantenerse. Cualquier renombre o cambio de tipo rompe `ChatPage.tsx` y sus 3 columnas. El test de shape del Paso 7 es la red.
- **Auto-scroll:** el efecto `messagesEndRef.current?.scrollIntoView(...)` en `[messages]` se queda en `useChatPage.ts` (root). Los sub-hooks no tienen refs de DOM.
- **Dynamic imports de mocks (`@mocks/data/convenios`):** viven hoy dentro de `selectConvenio`, del efecto de carga inicial y de `handleSelectConversation`. Al mover a `useChatIntegration` (mock) y `useChatSessionLifecycle`, hay que asegurar que **no** entran al bundle prod. Verificar con `pnpm build` que `MOCK_PERFIL_HOSTELERIA` y `MOCK_CHAT_MESSAGES` no aparecen en los chunks de producción.
- **`useChatPage.integration.test.tsx`:** es la red principal. Si un paso rompe algún assertion, revisar si el test estaba testando implementación (ej. contando `useState` calls) o comportamiento. Ajustar sólo si es implementación; el comportamiento debe mantenerse.
- **`ChatPage.stories.tsx`:** el Storybook usa `mockConvenios`, `mockPerfil`, `mockConversations`. Debe seguir funcionando. Ejecutar `pnpm storybook` como verificación visual final.
- **Skill SRP no cubre DRY/KISS/YAGNI ni antipatrones:** durante el análisis han surgido señales de DRY (branching mock/real duplicado), KISS (hook de 1052 líneas), YAGNI (¿realmente necesitamos el modo mock en producción o sólo en Storybook?). Estos ejes **no se atacan aquí**. Se registran en `TODO.md` para un análisis separado, junto con la propuesta de crear una nueva skill que cubra estos aspectos.

---

## 8. Checklist de validación post-refactor

- [ ] `pnpm typecheck` verde.
- [ ] `pnpm lint` verde.
- [ ] `pnpm test` (Playwright) verde — o con los mismos skips que hay hoy.
- [ ] Tests unitarios nuevos verdes: `variableClassification`, `syntheticPrompt`, `messageAdapters`, `specialStateMapper`, `useVariableChips`, `useProtocolState`, `useChatIntegration`, `useChatSessionLifecycle`.
- [ ] `pnpm build` sin errores; `MOCK_PERFIL_HOSTELERIA` y `MOCK_CHAT_MESSAGES` **no** aparecen en chunks prod.
- [ ] `pnpm storybook` renderiza `ChatPage.stories.tsx` sin regresiones visuales.
- [ ] `useChatPage.ts` ≤ 150 líneas.
- [ ] Ningún sub-hook supera ~200 líneas.
- [ ] `ChatPage.tsx` **no ha cambiado** (contrato de 34 campos intacto).
- [ ] Cada sub-hook se describe en una frase sin usar "y".
- [ ] En dev server modo real: enviar mensaje, cambiar convenio, cargar sesión histórica desde sidebar, click en chip de variable, activar modo salario, responder a DataRequestCard, disparar y descartar una alerta.
- [ ] En Storybook (modo mock): parsing de citaciones markdown sigue funcionando; conversaciones mock cargan bien.

---

## 9. Próximo paso recomendado

Ejecutar el **Paso 1** (helpers puros). Es el más mecánico: mueve funciones sin estado a su propio archivo y añade tests unitarios que hoy no existen. Deja `useChatPage.ts` ~80 líneas más pequeño antes de tocar la coreografía de sub-hooks.

Con este PR se cierra la violación 🔴 #5 del audit. Los pasos siguientes están registrados en `TODO.md` (raíz del proyecto) bajo el nuevo bloque **"Ingeniería del software"**, junto con el análisis pendiente de DRY / KISS / YAGNI / antipatrones y la propuesta de crear una nueva skill que cubra estos aspectos.
