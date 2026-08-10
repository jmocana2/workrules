---
name: testing
description: Apply this skill when writing new tests, reviewing existing tests, or refactoring test suites in this repo. Covers the testing pyramid (unit / integration / e2e), tool choice (Vitest, React Testing Library, Playwright, Deno test), TDD workflow, coverage targets, POM + mock server for e2e, and stable selector / smart-wait rules. Triggers: "nuevo test", "añadir tests", "revisar tests", "test para X", "refactor de tests", "cobertura", "TDD", "e2e", "Playwright", "Vitest".
---

# Testing — Guía del proyecto

Aplica esta guía cada vez que escribas o revises un test en `src/` o `supabase/functions/`.

---

## 1. Pirámide de testing

Respeta la proporción — invertirla (muchos e2e, pocos unit) es un smell.

| Nivel | Proporción | Velocidad | Qué prueban |
|---|---|---|---|
| **Unit** | 60–70% | Muy rápido | Funciones puras, lógica de negocio, cálculos, validaciones |
| **Integración** | 20–30% | Moderado | Flujos de usuario, interacción entre componentes, DOM real, flujos compartidos |
| **E2E** | 5–10% | Lento | Flujos críticos de negocio, cross-browser, regresiones end-to-end |

Antes de escribir un test nuevo, pregúntate: **¿en qué nivel debe vivir?** Si dudas entre integración y e2e, elige integración.

---

## 2. Características por nivel

### Unit
- Rápidos, aislados, deterministas, fáciles de mantener.
- Sin red, sin DOM real, sin filesystem.
- Ideales para funciones puras, value objects, mappers, validadores, cálculos de salario.

### Integración
- Moderadamente rápidos.
- Conectan varios componentes reales juntos.
- Usan DOM real (JSDOM vía React Testing Library).
- Validan flujos de usuario y contratos entre módulos.

### E2E
- Lentos y costosos.
- Browser real + network real (o mock server) + backend.
- Reserva para flujos críticos: login, chat completo, cálculo de salario end-to-end, checkout.

---

## 3. Herramientas por área

| Área | Unit | Integración | E2E |
|---|---|---|---|
| `src/` (React/TS) | **Vitest** | **React Testing Library** (sobre Vitest) | **Playwright** |
| `supabase/functions/` (Deno/TS) | **`deno test`** | `deno test` con adapters reales acotados | — (cubierto por e2e de frontend) |

No mezcles runners. No introduzcas Jest, Mocha, Cypress, etc.

### Convención de nombres y ejecución

- **Unit**: `*.test.ts` / `*.test.tsx` — se ejecutan con `pnpm test:unit` (Vitest) y `pnpm test:deno` (Deno).
- **Integración**: **obligatorio** el sufijo `*.integration.test.ts` / `*.integration.test.tsx`, tanto en `src/` como en `supabase/functions/`. Se ejecutan con `pnpm test:integration` (front), `pnpm test:deno:integration` (back) o `pnpm test:integration:all` (ambos).
- **E2E**: `tests/*.spec.ts` con Playwright — `pnpm test`.

Reglas de la convención `.integration`:

- Un test es integración si monta **>1 módulo de dominio** trabajando junto: hook + provider + repo fake; componente + store real + hijos reales; use case + adapter real; handler HTTP con `Request`/`Response` reales.
- Un test que renderiza un único componente atómico/molécula con RTL sigue siendo **unit** (aunque toque JSDOM).
- Los `test:deno` y `test:unit` **excluyen** por defecto los `*.integration.test.*` para que integración corra aislada y no dispare llamadas de red externas por accidente. Cualquier integration nuevo debe respetar el sufijo o quedará fuera del pipeline.

---

## 4. TDD — Red / Green / Refactor

Aplica TDD por defecto para lógica de dominio y use cases.

1. **Red**: escribe el test más pequeño que falla y describe el comportamiento deseado.
2. **Green**: escribe **el mínimo código** necesario para que pase. Nada más.
3. **Refactor**: limpia código y tests con la red en verde.

Reglas duras:

- **No escribas más tests de los necesarios.** Un test por comportamiento observable, no por línea.
- **No escribas más código del necesario para pasar esos tests.** Sin features especulativas.
- Cobertura esperada bajo TDD estricto: **≥ 95%**.

---

## 5. Coverage objetivo del proyecto

- **Funciones: 100%**
- **Líneas: ≥ 80%**

Si un archivo baja del umbral: primero pregunta *por qué falta cobertura* (código muerto, rama imposible, dependencia externa) antes de añadir tests solo para el número.

---

## 6. E2E — POM + Mock Server

Para todos los tests Playwright:

- **Page Object Model (POM)**: cada página/pantalla tiene su clase POM con selectores y acciones. Los tests hablan al POM, nunca a `page.locator` directamente.
- **Mock server strategy**: interceptar red con `page.route(...)` o un mock server dedicado. Los e2e no deben depender de que Supabase/Anthropic/OpenAI estén vivos.
- Cada test debe ser independiente y poder ejecutarse aislado.

---

## 7. Selectores estables

Orden de preferencia (usa siempre el más alto disponible):

1. `getByRole` — semántica accesible, resiste refactors.
2. `getByLabelText` — para inputs de formulario.
3. `getByTestId` — último recurso, requiere `data-testid` explícito.

**Prohibido:** selectores por clase CSS, por texto frágil traducible, por XPath, o por estructura del DOM (`nth-child`).

---

## 8. Esperas inteligentes

- ✅ `waitFor(...)`, `findBy...`, `expect(locator).toBeVisible()` (auto-wait de Playwright).
- ❌ `setTimeout`, `page.waitForTimeout(ms)`, sleeps arbitrarios.

Si un test necesita un sleep para pasar, hay una condición real que deberías estar esperando — encuéntrala.

---

## 9. Checklist rápida antes de aceptar un test

- [ ] ¿Está en el nivel correcto de la pirámide?
- [ ] Si es integración, ¿el fichero usa el sufijo `.integration.test.ts(x)`?
- [ ] ¿Prueba **un** comportamiento observable, no detalles de implementación?
- [ ] ¿Usa selectores estables (role > label > testid)?
- [ ] ¿Sin `setTimeout` ni sleeps?
- [ ] ¿Independiente de otros tests y del orden de ejecución?
- [ ] Si es e2e: ¿usa POM y red mockeada?
- [ ] ¿El código de producción se limitó al mínimo para pasarlo (TDD)?
- [ ] ¿La cobertura sigue cumpliendo 100% funciones / 80% líneas?
