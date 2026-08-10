# Informe de Tests End-to-End (E2E)

Fecha del informe: 2026-08-10
Runner: **Playwright** (`pnpm test`, config `playwright.config.ts`)
Browsers configurados: chromium, firefox, webkit
Servidor de test: `vite preview` en `http://127.0.0.1:4173` con `VITE_E2E_TESTING=true`

## Resumen

| Fichero | Tests activos | Tests skipped |
|---|---|---|
| `tests/chat-integration.spec.ts` | 5 | 1 |
| `tests/chat-flows.spec.ts` | 3 | 0 |
| **Total** | **8 activos** | **1 skipped** |

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

### `tests/chat-flows.spec.ts` — Flujos críticos del producto (3 activos)

Recuperados el 2026-08-10. Cubren los 3 flujos clave del producto:

1. `Consulta general devuelve respuesta con citation` — mockea `/functions/v1/chat` con SSE.
2. `Calculo de salario con datos completos muestra desglose`.
3. `Calculo con datos incompletos abre DataRequestCard`.

Usan `page.route()` para interceptar: auth, REST convenios, chat_sessions, chat_messages, perfil_json, y la Edge Function `/chat`. Para la sesión fake se sobrescribe `Storage.prototype.getItem` para responder a cualquier clave `sb-<projectref>-auth-token`, evitando que la storageKey dependa del `VITE_SUPABASE_URL` (que es un secret distinto en local y CI). Antes del fix, en CI la sesión fake no se devolvía y `streamChat()` abortaba con "No hay sesion activa" antes de disparar el mock SSE — en local pasaban por casualidad porque coincidía la clave con `sb-localhost-auth-token`.

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
- **1 test skipped** en `chat-integration.spec.ts` (chips de variables). Requiere mocks adicionales de perfil/variables — pendiente para feature dedicada.
- **CI validado**: los 3 tests críticos pasan en GitHub Actions tras el fix de storageKey (2026-08-10).

---

## Redundancias / posibles simplificaciones

- Los 5 tests de `chat-integration.spec.ts` son muy pequeños (smoke). Podrían consolidarse en 1-2 tests con múltiples asserts, dejando espacio para los flujos reales.
- El Page Object (`tests/pages/ChatPage.ts`) sólo se usa en 2 ficheros; a medida que se añadan más flujos conviene ampliarlo antes de duplicar selectores en los specs.

---

## Recomendaciones

1. **Añadir suite de auth** y de subida de convenio, que son los otros dos flujos críticos del producto.
2. **Activar mobile viewport** (Pixel 5, iPhone 12) al menos para los smoke tests, dado el foco mobile-first del proyecto.
3. **Introducir `axe-playwright`** para al menos un chequeo de accesibilidad por página principal.
4. **Configurar shards** en Playwright si los tiempos de CI crecen (hoy sólo 8 tests activos, no es urgente).
