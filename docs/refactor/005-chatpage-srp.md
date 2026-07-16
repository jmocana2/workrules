# Análisis SRP — `ChatPage.tsx`

**Fecha:** 2026-07-16
**Archivo:** `src/ui/components/workrules/pages/ChatPage/ChatPage.tsx` (712 líneas)
**Paradigma:** React 19 (componente funcional + hooks)
**Skill aplicada:** `.agents/skills/single-responsibility/SKILL.md`
**Contexto previo:**
- [`001-srp-audit.md`](./001-srp-audit.md) — auditoría original (violación 🔴 #4).
- [`002-ask-question-srp.md`](./002-ask-question-srp.md), [`003-calculate-salary-srp.md`](./003-calculate-salary-srp.md), [`004-handlers-srp.md`](./004-handlers-srp.md) — bloque backend, ya cerrado.

Este es el **primer** archivo del bloque frontend de la auditoría. `ChatPage.tsx` es el punto de entrada de la UI de chat y concentra render, layout responsive, coordinación de estado global de la página y helpers de dominio (citaciones). Después de este PR quedarán por atacar `useChatPage.ts` (#5), `useChatStream.ts` (#6) y `lib/chat-api.ts` (#7).

---

## 1. Test de las tres preguntas (skill SRP)

1. **Reasons to change** — describir el archivo hoy obliga a decir:
   > "Renderiza el layout de 3 columnas (sidebar / chat / variables) **y** decide qué variante mostrar según breakpoint (mobile / tablet / desktop) **y** gestiona 2 drawers móviles (sidebar y variables) **y** mide con `ResizeObserver` la altura del input fijo en móvil para ajustar el padding-bottom del scroll area **y** renderiza y deduplica citaciones (`MessageCitations`) **y** normaliza el plan de usuario (`normalizeUserPlan`) **y** decide el texto del estado vacío **y** decide si el submit es válido (`canSubmit`) **y** invalida la query de `user-convenios` cuando termina un upload **y** monta el controller de upload de convenios en el nivel raíz para que sobreviva a remounts del sidebar **y** enlaza al use case `openConvenioPdfUseCase` con el repositorio del provider **y** cierra drawers al seleccionar conversación o convenio **y** renderiza 3 alertas del protocolo (SMI, invalid_data, conflict) **y** renderiza `DataRequestCard` **y** renderiza el indicador de typing."
   → **15 "y"**. Falla catastróficamente.

2. **Audience of change** — al menos 4 audiencias distintas tocan este archivo:
   - **UI/diseño** — cambios en layout, spacing, breakpoints, empty state, indicador de typing.
   - **Responsive/mobile** — drawers, hamburger, `ResizeObserver` del input, safe-area, botón de variables en tablet.
   - **Dominio chat** — render de citaciones, alertas del protocolo, DataRequestCard, empty state contextual por convenio.
   - **Integración/infra** — invalidación de queries, `useRepositories`, controller de upload, use case de PDF, normalización de plan.

   Falla.

3. **Test isolation** — testear el render responsive obliga a mockear `useBreakpoint` + `useChatPage` (que a su vez pincha `useChat`, `useChatStream`, sesiones, Supabase). Testear `MessageCitations` requiere hoy renderizar toda la página o extraerlo manualmente en el test. Testear el ajuste de `mobileInputHeight` requiere mockear `ResizeObserver`. **Cada responsabilidad tiene un perfil de test radicalmente distinto** — señal clara de que conviven en el mismo archivo cosas que no deberían. Falla.

Los tres tests fallan → procede refactor.

---

## 2. Mapa de responsabilidades actuales

| Bloque | Líneas | Responsabilidad | ¿Puro? | Dependencias externas |
|---|---|---|---|---|
| Imports + lazy loads | 1–77 | Registro de componentes lazy (`MessageResponse`, `VariablesPanel`, `MobileDrawer`) | — | dynamic import |
| `normalizeUserPlan` | 80–82 | Reglas de negocio: mapea plan (`free/premium/enterprise`) → variante Sidebar | ✅ | — |
| `MessageCitations` | 84–157 | Componente: deduplica + renderiza citaciones + botón "Abrir PDF" | ✅ (componente puro) | `Sources`, `Source`, `BookIcon`, `ExternalLinkIcon` |
| `ChatPage` props destructuring | 159–170 | Firma pública del componente | — | — |
| Breakpoint + repos + PDF handler | 168–177 | Hook viewport + resolución de repo + wrapper de use case PDF | ❌ | `useBreakpoint`, `useRepositories`, `openConvenioPdfUseCase` |
| Estado drawers móviles | 179–180 | 2× `useState` para sidebar/variables drawer abierto | ❌ | React state |
| Medición altura input móvil | 182–198 | `useState` + `useEffect` + `ResizeObserver` para `mobileInputHeight` | ❌ | `ResizeObserver` |
| Convenios + plan (real vs mocks) | 200–208 | Selección entre datos reales y mocks de Storybook | ❌ | `useConvenios`, `useUserConvenios`, `useUserPlan`, `import.meta.env` |
| `useChatPage` destructuring | 210–267 | Consumo del mega-hook: estado + handlers + refs | — | `useChatPage` |
| `getEmptyStateText` | 270–285 | Selección de texto de estado vacío según convenio | ✅ | `CHAT_TEXTS` |
| `canSubmit` + `handlePromptSubmit` | 290–297 | Regla de habilitación del submit del prompt | ✅ | — |
| `handleSelectConversationAndClosDrawer` | 300–305 | Handler compuesto: seleccionar + cerrar drawer | ❌ | breakpoint state |
| `handleConvenioUploaded` | 307–309 | Invalida `user-convenios` query | ❌ | `queryClient` |
| `convenioUploaderController` | 314–316 | Hook de controller elevado al root de página | ❌ | `useConvenioUploaderController` |
| `handleSelectConvenioFromManager` | 319–329 | Handler compuesto: buscar convenio + seleccionar + cerrar drawer | ❌ | — |
| Layout root + Sidebar column | 331–398 | Render de Sidebar según breakpoint (desktop / tablet-collapsed / drawer) | — | — |
| Header sticky | 402–460 | Render del header con `ConvenioSelector`, hamburger, botón variables | — | — |
| Área de mensajes | 462–611 | ScrollArea + empty state + lista de mensajes + alertas + DataRequestCard + typing | — | — |
| Input + chips | 615–663 | Render del `PromptInput` fijo (mobile) o estático (desktop) + chips de variables | — | — |
| Variables column | 666–709 | Render de `VariablesPanel` según breakpoint (desktop / tablet-collapsed / drawer) | — | — |

**Observaciones:**
- El archivo tiene **3 columnas** en el JSX (sidebar, chat central, variables) y las 3 tienen la misma lógica repetida: "si mobile o tablet → drawer + fallback colapsado; si desktop → panel expandido". Es la duplicación estructural más obvia.
- La medición del alto del input con `ResizeObserver` (líneas 182–198) sólo aplica cuando `isMobile`. Vive suelta en el componente pero es una utilidad concreta y aislable.
- `MessageCitations` (74 líneas) ya está definido fuera del componente `ChatPage` pero en el mismo archivo. Merece su propio archivo porque tiene sus propias reglas de deduplicación y accesibilidad.
- `normalizeUserPlan` es una regla de dominio que sólo aplica al Sidebar. Puede vivir con la columna del sidebar o como util.
- La destructuración de `useChatPage` (57 líneas de props) es sintomática del problema #5 del audit (`useChatPage.ts` >400 líneas), no de `ChatPage.tsx`. Se ataca en el próximo refactor; aquí sólo se registra.
- `handleSelectConvenioFromManager` y `handleSelectConversationAndClosDrawer` son adaptadores que combinan lógica de dominio con cerrado de drawer. Pertenecen a la lógica responsive.

---

## 3. Violaciones críticas SRP

### 🔴 3.1 Layout responsive triplicado dentro del render principal
Las tres columnas (sidebar, header, variables) repiten el mismo patrón `isMobile || isTablet ? (drawer + colapsado) : (panel completo)`. Cambiar el criterio de responsive (p.ej. añadir un breakpoint intermedio o cambiar cuándo aparece el drawer) obliga a tocar 3 bloques JSX distintos que fácilmente divergirán. Además, `isSidebarOpen` y `isVariablesPanelOpen` son estado local que sólo tiene sentido dentro de esos sub-árboles.

### 🔴 3.2 Render de citaciones (`MessageCitations`) mezclado con la página
Los 74 líneas de `MessageCitations` (dedup + accesibilidad + estilos + botón "Abrir PDF" + hidePerCitationLinks) son un componente autocontenido. Vive en el mismo archivo por conveniencia histórica, pero cualquier cambio en la lógica de citaciones no debería obligar a abrir `ChatPage.tsx`. Coincide con el diagnóstico del audit §Frontend/#4.

### 🔴 3.3 Medición del alto del input (`ResizeObserver`) suelta en el componente
`mobileInputEl` + `mobileInputHeight` + el `useEffect` con `ResizeObserver` (17 líneas) son una utilidad de layout muy específica y perfectamente aislable como hook (`useElementHeight` o `useMobileInputHeight`). Hoy contamina el body del componente y ocupa un tercio del setup.

### 🟡 3.4 Handlers compuestos (`handleSelectConversationAndClosDrawer`, `handleSelectConvenioFromManager`) mezclan dominio + cerrado de drawer
Ambos combinan "haz X de dominio" + "cierra el drawer si estás en mobile/tablet". Al extraer la columna del sidebar como componente propio, el cierre del drawer queda dentro del sub-árbol que lo posee y el handler compuesto desaparece.

### 🟡 3.5 Estado vacío + `canSubmit` + `normalizeUserPlan` son helpers de dominio en el componente
No es un problema grande — son funciones pequeñas — pero son reglas de negocio que pueden vivir junto a los textos/tipos (`ChatPage.helpers.ts` o similar), no en el archivo de render.

### 🟡 3.6 Invalidación de queries + controller de upload elevados al root
`handleConvenioUploaded` (invalida `user-convenios`) y el `useConvenioUploaderController` (elevado al root para sobrevivir a remounts del sidebar por cambio de breakpoint) son piezas de integración con el sidebar. El comentario de las líneas 311–314 lo justifica: **la elevación es intencional** para que el hook no se remonte al cambiar viewport. Esto **no** se debe deshacer. Sí se puede encapsular en un hook (`useConvenioUploadIntegration`) que devuelva el controller + `onConvenioUploaded` para pasarlos al sidebar.

---

## 4. Estrategia

La duplicación estructural del render y la mezcla de responsabilidades responsivas apuntan al mismo patrón: **una columna = un componente**. Cada columna es dueña de su render (mobile/tablet/desktop) y de su estado de drawer. `ChatPage.tsx` queda como un **orquestador** que compone las 3 columnas, consume `useChatPage`, y no toca ni un breakpoint ni un drawer directamente.

Otra decisión clave: no promover ninguna abstracción cross-column. Cada columna tiene su propio patrón (sidebar tiene colapsado-en-tablet + drawer-expandible; center tiene header sticky variable; variables tiene colapsado-en-tablet + drawer). Un `<ResponsiveColumn>` genérico oscurecería las diferencias reales.

### 4.1 Estructura objetivo

```
src/ui/components/workrules/pages/ChatPage/
├── ChatPage.tsx                    # orquestador — ~150 líneas
├── ChatPage.types.ts               # (ya existente, sin cambios)
├── useChatPage.ts                  # (sin cambios en este PR — se ataca en 006)
├── parseAlertEvent.ts              # (sin cambios)
├── components/                     # NUEVO
│   ├── ChatSidebarColumn.tsx       # Sidebar + drawer + normalización de plan
│   ├── ChatCenterColumn.tsx        # header sticky + área de mensajes + input
│   ├── ChatVariablesColumn.tsx     # VariablesPanel + drawer
│   └── MessageCitations.tsx        # extraído del archivo raíz
├── hooks/                          # NUEVO
│   ├── useMobileInputHeight.ts     # ResizeObserver + altura
│   └── useConvenioUploadIntegration.ts  # controller + onConvenioUploaded (invalidateQueries)
└── helpers/                        # NUEVO
    ├── emptyState.ts               # getEmptyStateText
    ├── canSubmit.ts                # canSubmit
    └── normalizeUserPlan.ts        # normalizeUserPlan
```

### 4.2 Reglas que aplicamos
- Cada componente/hook/helper describe su responsabilidad en una frase sin usar "y".
- **No** se toca `useChatPage.ts` en este PR. Su destructuración sigue igual desde `ChatPage.tsx`, pero los objetos resultantes se pasan por props a cada columna. El refactor de ese hook va en el doc 006 (siguiente).
- **No** se toca `ChatPage.types.ts`. Los tipos ya están estables.
- **No** se cambia el comportamiento observable. Este es un refactor puro; los tests existentes (`ChatPage.test.tsx`, `useChatPage.integration.test.tsx`, `parseAlertEvent.test.ts`) deben seguir pasando sin modificar assertions.
- La elevación del `convenioUploaderController` al root de la página se mantiene — sólo se encapsula en un hook para reducir ruido.
- Ningún archivo nuevo debe superar ~150 líneas.

### 4.3 Qué NO extraer (aún)
- **No** dividir aún el `useChatPage`. Es el punto #5 del audit y merece su propio PR. Aquí `ChatPage.tsx` sigue consumiéndolo con toda la destructuración; sólo distribuye las props a las columnas.
- **No** crear un `<ResponsiveColumn>` genérico. Las 3 columnas tienen patrones sutilmente distintos (sidebar tiene colapsado-en-tablet + logo header alternativo cuando no hay convenio; center tiene header sticky con `ConvenioSelector`; variables tiene colapsado-en-tablet sin logo). Genericar los oscurecería.
- **No** mover las alertas del protocolo (`AlertSMI`, `AlertInvalidData`, `AlertConflict`, `DataRequestCard`) a su propio componente todavía. Viven dentro del área de mensajes y su render es corto y declarativo. Si en el futuro crece se puede extraer un `<ChatAlertsStack>`, pero hoy no aporta.
- **No** promover `MessageCitations` a `molecules/`. Es específico de esta página (usa `hidePerCitationLinks` para el caso mobile/tablet). Vive en `ChatPage/components/`.
- **No** unificar los helpers (`emptyState`, `canSubmit`, `normalizeUserPlan`) en un mismo `ChatPage.helpers.ts`. Son responsabilidades distintas; archivos pequeños con nombre semántico son más buscables.

---

## 5. Propuesta de reorganización

### 5.1 Archivos y responsabilidades

| Archivo | Contiene | Razón de existir |
|---|---|---|
| `components/ChatSidebarColumn.tsx` | Render del sidebar en 3 variantes (desktop, tablet-colapsado, drawer). Recibe estado (conversations, currentConversationId, userConvenios, plan) + handlers como props. Posee `isSidebarOpen` interno. | Cambia con el criterio responsive del sidebar o con nuevas variantes de `Sidebar`. |
| `components/ChatCenterColumn.tsx` | Header sticky + `ScrollArea` con mensajes/alertas/typing + input fijo/estático. Posee la ref al elemento del input (delega la medición a `useMobileInputHeight`). | Cambia con el layout central o con nuevos tipos de mensaje/alerta. |
| `components/ChatVariablesColumn.tsx` | Render del panel de variables en 3 variantes (desktop, tablet-colapsado, drawer). Posee `isVariablesPanelOpen` interno. | Cambia con el criterio responsive del panel de variables. |
| `components/MessageCitations.tsx` | Dedup + render de citaciones + botón "Abrir PDF". Sin cambios de API. | Cambia con la lógica de citaciones. |
| `hooks/useMobileInputHeight.ts` | Hook que devuelve `{ ref, height }`. Registra `ResizeObserver` sólo cuando `enabled` (isMobile). Cero acoplamiento a chat. | Cambia con el mecanismo de medición. |
| `hooks/useConvenioUploadIntegration.ts` | Devuelve `{ controller, onConvenioUploaded }`. Encapsula `useConvenioUploaderController` + `queryClient.invalidateQueries`. | Cambia con la integración entre upload y caché de queries. |
| `helpers/emptyState.ts` | `getEmptyStateText(selectedConvenio)` → `{ title, description }`. | Cambia con los textos del estado vacío. |
| `helpers/canSubmit.ts` | `canSubmit({ text, selectedConvenio, salaryMode, hasIdentifyingVariables })` → boolean. | Cambia con la regla de habilitación del submit. |
| `helpers/normalizeUserPlan.ts` | `normalizeUserPlan(plan)` → `'free' \| 'premium'`. | Cambia con el modelo de planes. |
| `ChatPage.tsx` | Orquestador: consume `useChatPage`, `useBreakpoint`, `useConvenios`/`useUserConvenios`/`useUserPlan`, `useConvenioUploadIntegration`. Compone 3 columnas. | Cambia con la topología de la página. |

### 5.2 Notas de diseño puntuales

- **`ChatSidebarColumn`** posee `isSidebarOpen` como estado interno. Expone un método imperativo NO — recibe callbacks (`onSelectConversation`, `onSelectConvenioFromManager`) y decide cerrar el drawer localmente cuando `isMobile || isTablet`. Los handlers compuestos (`handleSelectConversationAndClosDrawer`, `handleSelectConvenioFromManager`) desaparecen del root.
- **`ChatCenterColumn`** recibe la lista de props de `useChatPage` que consume (messages, isLoading, alertState, dataRequestState, input, handlers, refs, activeVariables, salaryMode, etc.). Es una interfaz larga pero explícita. **No** promocionamos a Context aquí — Context ocultaría el contrato y complica testing.
- **`ChatVariablesColumn`** posee `isVariablesPanelOpen`. Recibe `perfilJson`, `activeVariables`, `handleVariableClick`, `isVariablesPanelCollapsed`, `toggleVariablesPanel`.
- **`useMobileInputHeight`** firma: `useMobileInputHeight(enabled: boolean): { ref: (el: HTMLDivElement | null) => void; height: number }`. Cuando `enabled === false`, height siempre es 0. Se usa dentro de `ChatCenterColumn`.
- **`useConvenioUploadIntegration`** firma: `useConvenioUploadIntegration(): { controller, onConvenioUploaded }`. Se llama en `ChatPage.tsx` (root) para preservar el hook a través de remounts del sidebar.
- **`MessageCitations`** conserva su API actual (`citations`, `convenioId`, `onOpenPdf`, `hidePerCitationLinks`). Sólo cambia su path de import.
- **Cómo pasa `ChatPage.tsx` la avalancha de props a las columnas** — se agrupan por columna. Ejemplo esbozado:
  ```tsx
  const sidebar = { conversations, currentConversationId, userConvenios, userPlan, ... };
  const center  = { messages, input, isLoading, alertState, dataRequestState, handlers..., refs... };
  const variables = { perfilJson, activeVariables, handleVariableClick, ... };
  return (
    <ChatLayout>
      <ChatSidebarColumn {...sidebar} />
      <ChatCenterColumn {...center} />
      <ChatVariablesColumn {...variables} />
    </ChatLayout>
  );
  ```
  Esta agrupación no crea nuevas abstracciones — es simple grouping de props por destino.

---

## 6. Plan de ejecución por commits atómicos

Cada paso es reversible por sí mismo. `pnpm typecheck`, `pnpm lint` y `pnpm test` (Playwright) deben pasar tras cada commit. En este refactor los tests unitarios (`ChatPage.test.tsx`, `useChatPage.integration.test.tsx`) son los guardias principales; los e2e sólo se ejecutan al final.

### Paso 1 — Extraer helpers puros y `MessageCitations`
1. Crear `helpers/normalizeUserPlan.ts` con la función tal cual.
2. Crear `helpers/emptyState.ts` con `getEmptyStateText(selectedConvenio)` — recibe el convenio como parámetro (no lee del componente).
3. Crear `helpers/canSubmit.ts` con `canSubmit({ text, selectedConvenio, salaryMode, hasIdentifyingVariables })`.
4. Crear `components/MessageCitations.tsx` moviendo el componente actual + su tipo interno.
5. En `ChatPage.tsx`: importar los 4 nuevos módulos, eliminar sus definiciones locales.
6. `pnpm typecheck` + `pnpm lint` + `pnpm test:deno` (por si acaso, aunque no aplica aquí) + tests de vitest verdes.
7. **Commit:** `refactor(chat-page): extract pure helpers and MessageCitations`.

### Paso 2 — Extraer hooks (`useMobileInputHeight`, `useConvenioUploadIntegration`)
1. Crear `hooks/useMobileInputHeight.ts` con la lógica de `useState` + `useEffect` + `ResizeObserver`. Firma: `(enabled: boolean) => { ref, height }`.
2. Crear `hooks/useConvenioUploadIntegration.ts` que llame internamente a `useConvenioUploaderController` y devuelva `{ controller, onConvenioUploaded }`.
3. Reemplazar en `ChatPage.tsx` el estado + efecto + handlers correspondientes por las llamadas a los nuevos hooks.
4. `pnpm typecheck` + tests unitarios verdes. Verificar manualmente en dev server que la medición del input móvil sigue funcionando (rotar móvil / abrir teclado).
5. **Commit:** `refactor(chat-page): extract layout hooks (mobile input height, convenio upload integration)`.

### Paso 3 — Extraer `ChatSidebarColumn`
1. Crear `components/ChatSidebarColumn.tsx` moviendo el bloque JSX del sidebar (líneas 338–398) + el estado `isSidebarOpen`.
2. La columna recibe como props: `conversations`, `currentConversationId`, `userConvenios`, `loadingUserConvenios`, `userPlan`, `convenioUploaderController`, `onConvenioUploaded`, `onNewConversation`, `onSelectConversation`, `onOpenSettings`, `onSelectConvenio` (para pasar el objeto convenio completo). El isMobile/isTablet se lee dentro con `useBreakpoint()` o se pasa por prop; **recomendación**: pasar por prop para mantener la columna testeable sin mockear el hook.
3. Los handlers compuestos `handleSelectConversationAndClosDrawer` y `handleSelectConvenioFromManager` se recrean dentro de la columna (ahora tienen acceso local al setter del drawer).
4. Reemplazar el bloque en `ChatPage.tsx` por `<ChatSidebarColumn ... />`.
5. `pnpm typecheck` + tests verdes.
6. **Commit:** `refactor(chat-page): extract ChatSidebarColumn`.

### Paso 4 — Extraer `ChatVariablesColumn`
1. Crear `components/ChatVariablesColumn.tsx` moviendo el bloque JSX del panel de variables (líneas 666–709) + el estado `isVariablesPanelOpen` + el botón "Ver variables" del header (que hoy vive en el header).
2. Nota: el botón `SlidersIcon` del header abre este drawer. Hay dos opciones:
   - **Opción A** (elegida): el drawer y su `useState` viven dentro de `ChatVariablesColumn`. El botón sigue en el header pero se pasa `onOpenVariablesPanel` como callback desde el root — o se sube el estado con `useState` en el root y se pasa a ambos (el botón del header y la columna). Esta segunda opción es más simple: dejar `isVariablesPanelOpen` en el root y pasarlo a las dos zonas.
   - **Recomendación:** dejar `isVariablesPanelOpen` en `ChatPage.tsx` como estado root y pasarlo por props tanto al header (`ChatCenterColumn`) como al panel (`ChatVariablesColumn`). Es la única pieza de estado UI compartida entre columnas y es honesta.
3. Reemplazar el bloque en `ChatPage.tsx` por `<ChatVariablesColumn ... />`.
4. `pnpm typecheck` + tests verdes.
5. **Commit:** `refactor(chat-page): extract ChatVariablesColumn`.

### Paso 5 — Extraer `ChatCenterColumn`
1. Crear `components/ChatCenterColumn.tsx` moviendo header + ScrollArea + input (líneas 401–663).
2. Recibe props: `selectedConvenio`, `convenios`, `loadingConvenios`, `messages`, `isLoading`, `alertState`, `dataRequestState`, `input`, `activeVariables`, `salaryMode`, `hasIdentifyingVariables`, `messagesEndRef`, `inputRef`, refs y handlers necesarios (`handleInputChange`, `handlePromptSubmit`, `handleVariableRemove`, `humanizeVariableLabel`, alerts handlers, dataRequest handlers, `handleOpenConvenioPdf`, `selectConvenio`, `clearConvenio`, `setSalaryMode`), `onOpenSidebar`, `onOpenVariablesPanel`, flags `isMobile`, `isTablet`.
3. Dentro usa `useMobileInputHeight(isMobile)` para el padding-bottom del scroll.
4. Reemplazar el bloque en `ChatPage.tsx`.
5. `pnpm typecheck` + tests unitarios + **Playwright e2e** verdes.
6. **Commit:** `refactor(chat-page): extract ChatCenterColumn`.

### Paso 6 — Verificación final y limpieza
1. Ejecutar `pnpm typecheck` + `pnpm lint` + `pnpm test` (Playwright) + `pnpm build`.
2. Confirmar tamaños:
   - `ChatPage.tsx` ≤ 150 líneas.
   - Ninguna columna supera ~200 líneas (center puede quedarse cerca por la lista de mensajes + alertas).
   - Ningún hook supera ~40 líneas.
3. Verificar manualmente en dev server los 3 breakpoints (mobile, tablet, desktop) + los 2 drawers + la altura del input móvil.
4. **Commit:** `chore(chat-page): final cleanup and size checks for ChatPage refactor`.

---

## 7. Riesgos y notas de ejecución

- **Playwright e2e:** el test `ChatPage.test.tsx` está actualmente **skipeado** según memoria (`project_known_issues.md`). El e2e real está en `tests/pages/ChatPage.ts`. Ejecutar `pnpm test` al final del refactor para verificar que ningún flujo se rompió (selector, envío, alertas). Si el e2e sigue skipeado, apoyarse en `useChatPage.integration.test.tsx` como red principal.
- **Storybook:** `ChatPage.stories.tsx` importa `ChatPage` y pasa mocks. Debe seguir funcionando sin cambios. Ejecutar `pnpm storybook` como verificación visual final.
- **Elevación del controller de upload:** el comentario de las líneas 311–314 documenta explícitamente por qué el hook vive en el root: para sobrevivir a remounts del sidebar al cambiar breakpoint (rotar el móvil). El nuevo `useConvenioUploadIntegration` **debe llamarse en `ChatPage.tsx`, no dentro de `ChatSidebarColumn`**. Si por error se llama dentro de la columna, se rompe la persistencia del upload en curso al rotar el dispositivo.
- **`useChatPage` intacto:** este PR **no** modifica `useChatPage.ts`. La destructuración de 57 líneas se mantiene en `ChatPage.tsx` (o se agrupa manualmente por columna). El refactor de `useChatPage` va en el doc 006, que es donde realmente se ataca la audiencia "estado + handlers".
- **Ref forwarding en textarea:** `inputRef` se pasa hoy al `PromptInputTextarea`. Al mover ese bloque a `ChatCenterColumn`, la ref sigue viniendo desde `useChatPage` en el root y se propaga por props. Verificar que el foco tras enviar mensaje sigue funcionando.
- **`isMobile`/`isTablet` como prop vs hook interno:** las columnas pueden leer `useBreakpoint()` o recibir los flags por props. **Recomendación:** recibir por props para que sean puras y testables sin mockear el hook. `ChatPage.tsx` lee una sola vez y distribuye.
- **Import cycle:** cuidado con circularidades entre `ChatPage.tsx` → `components/*` → `hooks/*` → helpers. Mantener helpers y hooks sin imports desde `components/` ni `ChatPage.tsx`.
- **No cambiar `ChatPage.types.ts`:** los tipos `Citation`, `AlertConflictPayload`, etc. siguen viviendo donde están. Sólo se importan desde más sitios (columnas + `MessageCitations.tsx`).

---

## 8. Checklist de validación post-refactor

- [ ] `pnpm typecheck` verde.
- [ ] `pnpm lint` verde.
- [ ] `pnpm test` (Playwright) verde — o con los mismos skips que hay hoy (documentados en memoria).
- [ ] `pnpm build` sin errores.
- [ ] `pnpm storybook` renderiza `ChatPage.stories.tsx` sin regresiones.
- [ ] `ChatPage.tsx` ≤ 150 líneas.
- [ ] `MessageCitations` vive en `components/MessageCitations.tsx`; no queda ninguna definición en el archivo raíz.
- [ ] `ResizeObserver` no aparece en `ChatPage.tsx`; sólo en `hooks/useMobileInputHeight.ts`.
- [ ] Cada columna se describe en una frase sin usar "y".
- [ ] En mobile: rotar portrait ↔ landscape mientras hay un upload de convenio en curso no cancela el upload (regresión de la elevación del controller).
- [ ] En mobile: el input fijo nunca tapa el final del chat (padding-bottom dinámico funciona).
- [ ] En tablet: sidebar y variables panel colapsados aparecen; al pulsar los expanders se abren los drawers respectivos.
- [ ] Citaciones: en desktop se ven los enlaces per-citation; en mobile/tablet sólo el botón "Abrir PDF original" (`hidePerCitationLinks`).

---

## 9. Próximo paso recomendado

Ejecutar el **Paso 1** (helpers puros + `MessageCitations`). Es el más mecánico y sin riesgo: son movimientos de código sin cambio de comportamiento, respaldados por typecheck y por los tests unitarios existentes. Deja el archivo raíz ya notablemente más limpio antes de atacar las columnas.

Con este PR se cierra la primera de las 4 violaciones frontend del audit (#4). Después vendrán:
- **006** — refactor de `useChatPage.ts` (audit #5): dividir el mega-hook en `useChatIntegration`, `useVariablePanel`, `useChatSessions` ampliado.
- **007** — refactor de `useChatStream.ts` (audit #6): extraer `StreamEventDispatcher` + `ChatMessageAccumulator`.
- **008** — refactor de `lib/chat-api.ts` (audit #7): extraer `SSEParser` + `ChatAuthClient`.
