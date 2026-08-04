# Informe de Tests End-to-End (E2E)

Fecha del informe: 2026-08-04
Runner: **Playwright** (`pnpm test`, config `playwright.config.ts`)
Browsers configurados: chromium, firefox, webkit
Servidor de test: `vite preview` en `http://127.0.0.1:4173` con `VITE_E2E_TESTING=true`

## Resumen

| Fichero | Tests activos | Tests skipped |
|---|---|---|
| `tests/chat-integration.spec.ts` | 5 | 1 |
| `tests/chat-flows.spec.ts` | 0 | 3 (todo el `describe` con `.skip`) |
| **Total** | **5 activos** | **4 skipped** |

Page Object: `tests/pages/ChatPage.ts`.

Cobertura: **no aplica métrica de líneas** en e2e. Aquí lo relevante es la cobertura funcional (flujos de usuario cubiertos).

---

## Inventario de tests

### `tests/chat-integration.spec.ts` — Smoke de carga del chat (5 activos)

Verifican que la UI arranca y responde a interacciones básicas. **No usan mocks de red**: la app arranca en modo E2E y estos tests sólo comprueban render y estado deshabilitado.

1. `la pagina de chat carga correctamente` — el selector de convenio se ve.
2. `puede seleccionar un convenio del selector` — abre dropdown y muestra input.
3. `el input de chat esta deshabilitado sin convenio seleccionado`.
4. `muestra estado vacio con mensaje descriptivo`.
5. `muestra el Sidebar con boton de nueva conversacion`.

**Skipped**: `flujo completo: seleccionar convenio y ver chips de variables` — requeriría mocks o Supabase real.

### `tests/chat-flows.spec.ts` — Flujos críticos del producto (3 skipped)

Todo el `describe` está en `.skip` (ver comentario TODO en el fichero: tras a300e40 + c417e35 el mock SSE quedó desincronizado con el nuevo flujo de variables resueltas).

1. `Consulta general devuelve respuesta con citation` — mockea `/functions/v1/chat` con SSE.
2. `Calculo de salario con datos completos muestra desglose`.
3. `Calculo con datos incompletos abre DataRequestCard`.

Usan `page.route()` para interceptar: auth, REST convenios, chat_sessions, chat_messages, perfil_json, y la Edge Function `/chat`. Inyectan sesión fake en `localStorage` para bypass del auth.

---

## Huecos detectados

### Flujos no cubiertos
- **Autenticación real** (login/logout, magic link, expiración de sesión).
- **Subida de convenio** (`ConvenioUploader`) — no hay e2e del drag&drop + POST a Storage + webhook.
- **Gestión de convenios propios** (`ConvenioManager`): crear/editar/borrar.
- **Cambio de tema** (light/dark) y persistencia.
- **Historial de conversaciones** en Sidebar (crear, seleccionar, borrar).
- **Cálculo de salario** con `VariablesPanel` (rellenar variables desde la UI, no como chip auto-detectado).
- **Estados de error**: 401, 429 (quota), 500 del backend.
- **Mobile viewports**: configuración presente pero comentada en `playwright.config.ts`.
- **Accesibilidad**: `axe-playwright` instalado pero no usado en ningún test.

### Deuda técnica
- **3 tests críticos skipped** (`chat-flows.spec.ts`) — son los que dan valor real de negocio. Recuperarlos es la prioridad #1.
- **1 test skipped** en `chat-integration.spec.ts` (chips de variables).
- **Sin CI validado**: memoria del proyecto indica que la fix de timeout de chromium en GH Actions está pendiente de validación.

---

## Redundancias / posibles simplificaciones

- Los 5 tests de `chat-integration.spec.ts` son muy pequeños (smoke). Podrían consolidarse en 1-2 tests con múltiples asserts, dejando espacio para los flujos reales.
- El Page Object (`tests/pages/ChatPage.ts`) sólo se usa en 2 ficheros; a medida que se añadan más flujos conviene ampliarlo antes de duplicar selectores en los specs.

---

## Recomendaciones

1. **Desbloquear los 3 tests de `chat-flows.spec.ts`** — actualizar los mocks SSE al nuevo protocolo de `resolvedVariables`. Es el mayor valor por esfuerzo.
2. **Añadir suite de auth** y de subida de convenio, que son los otros dos flujos críticos del producto.
3. **Activar mobile viewport** (Pixel 5, iPhone 12) al menos para los smoke tests, dado el foco mobile-first del proyecto.
4. **Introducir `axe-playwright`** para al menos un chequeo de accesibilidad por página principal.
5. **Configurar shards** en Playwright si los tiempos de CI crecen (hoy sólo 5 tests activos, no es urgente).
