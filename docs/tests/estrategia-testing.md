# Estrategia de Testing - WorkRules

**Fecha:** Febrero 2026 | **Arquitectura:** Monolito Modular | **Stack:** React 19 + Supabase Edge Functions (Deno)

---

## 1. Testing Pyramid

```
        ┌─────────┐
        │   E2E   │  5-10%
        │Playwright│
       ┌┴─────────┴┐
       │Integration │  20-30%
       │Vitest + RTL│
      ┌┴───────────┴┐
      │    Unit     │  60-70%
      │Vitest + Deno│
      └─────────────┘
```

### Principio rector

**Testear comportamiento, no implementación.** Los tests deben centrarse en lo que el usuario experimenta, no en los detalles internos del código.

---

## 2. Stack de Testing por Capa

### Modelo recomendado: doble carril

1. **Carril A (UI Contract):** tests nativos de Storybook 10 sobre `*.stories.*` para validar estados visuales, interacción básica y regresiones de composición.
2. **Carril B (Lógica de app):** tests de nuestro stack (Vitest + RTL, Deno test, Playwright) para comportamiento funcional, reglas de negocio y flujos end-to-end.

| Capa | Tecnología | Runner | Ubicación |
|------|------------|--------|-----------|
| **Frontend (Storybook native)** | Storybook 10 + `@storybook/addon-vitest` + `storybook/test` | Vitest project `storybook` | `src/**/*.stories.{ts,tsx}` + `src/**/*.mdx` |
| **Frontend (Unit)** | Vitest + vi.mock() | Node.js | `src/**/*.test.ts` |
| **Frontend (Integration)** | Vitest + React Testing Library | Node.js | `src/**/*.test.tsx` |
| **Edge Functions (Unit)** | Deno Test + std/testing/mock | Deno | `supabase/functions/**/*.test.ts` |
| **Edge Functions (Integration)** | Supabase CLI local + Deno Test | Deno | `supabase/functions/**/*.integration.test.ts` |
| **E2E** | Playwright + POM | Node.js | `e2e/specs/**/*.spec.ts` |
---

## 3. Objetivos de Coverage

### Coverage General

| Métrica | Objetivo | Justificación |
|---------|----------|---------------|
| **Functions** | 90% | Evita testear getters triviales y boilerplate |
| **Lines** | 70% | Sostenible para solo-dev sin tests de relleno |

### Baseline actual (frontend `src/`)

Medido con `pnpm test:unit:coverage` el 2026-08-03 sobre 28 archivos / 409 tests:

| Métrica | Actual | Objetivo | Gap |
|---------|--------|----------|-----|
| Statements | 49.76% | — | — |
| Branches | 41.68% | — | — |
| Functions | 44.72% | 90% | −45 pp |
| Lines | 51.67% | 70% | −18 pp |

Áreas con 0% cobertura detectadas: `src/application/use-cases/userPlan.ts`, mayoría de `src/infrastructure/repositories/`, varios shadcn wrappers (`dialog`, `dropdown-menu`, `select`, `hover-card`). Ver paso 2.4 del plan de mejora para priorización.

### Objetivos por Área

| Área | Objetivo | Notas |
|------|----------|-------|
| User flows | 90% | Flujos principales del chat RAG |
| Component integration | 85% | Componentes que interactúan entre sí |
| State management | 80% | Testear lógica propia, no TanStack Query |
| API Integration | 80% | Enfoque en flujo RAG y Edge Functions |
| Validación formularios | 100% | Crítico para LegalTech |

---

## 4. Estructura de Tests

### Frontend (`src/`)

```
src/
├── ui/components/workrules/
│   ├── atoms/
│   │   ├── ThemeToggle/
│   │   │   ├── ThemeToggle.tsx
│   │   │   ├── ThemeToggle.stories.tsx   # Storybook native tests
│   │   │   └── ThemeToggle.test.tsx      # Vitest + RTL
│   │   └── ...
├── core/
├── lib/
└── ...
```

### Edge Functions (supabase/functions)

```
supabase/functions/
├── chat/
│   ├── index.ts                        # Edge Function
│   ├── index.test.ts                   # Unit test
│   └── index.integration.test.ts       # Integration test
├── webhook-pdf/
│   ├── index.ts
│   └── index.test.ts
├── _shared/
│   ├── core/
│   │   ├── chat/
│   │   │   ├── handlers.ts
│   │   │   ├── handlers.test.ts
│   │   │   └── types.ts
│   │   └── convenio/
│   │       ├── calculator.ts
│   │       └── calculator.test.ts      # Crítico: lógica de cálculo
│   └── lib/
│       ├── supabase.ts
│       └── supabase.test.ts
└── deno.json                           # Configuración Deno + test tasks
```

### E2E (e2e/)

```
e2e/
├── pages/                              # Page Object Model
│   ├── BasePage.ts
│   ├── ChatPage.ts
│   └── ConvenioPage.ts
├── fixtures/
│   └── test-data.ts
├── specs/
│   ├── chat-flow.spec.ts
│   └── convenio-search.spec.ts
├── playwright.config.ts
└── global-setup.ts                     # Mock server setup
```

---

## 5. Configuración

### 5.1 Vitest (Frontend - stack propio)

```typescript
// vitest.unit.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'src/**/*.d.ts'],
      thresholds: {
        functions: 90,
        lines: 70
      }
    }
  }
})
```

### 5.1.b Storybook 10 native tests (carril UI)

En este repo, Storybook 10 está integrado vía `@storybook/addon-vitest` y corre sobre el proyecto de Vitest llamado `storybook`.

- Incluye historias: `src/**/*.stories.{ts,tsx}` y `src/**/*.mdx`
- Import utilidades de test desde `storybook/test` (no `@storybook/test`)
- Comando recomendado: `pnpm test:storybook`

Esto valida contratos visuales e interacción a nivel de historia, pero **no reemplaza** los tests `*.test.ts(x)` de lógica/comportamiento.

### 5.2 Deno (Edge Functions)

```json
// supabase/functions/deno.json
{
  "tasks": {
    "test": "deno test --allow-env --allow-net --allow-read",
    "test:watch": "deno test --watch --allow-env --allow-net --allow-read",
    "test:coverage": "deno test --coverage=coverage --allow-env --allow-net --allow-read",
    "coverage:report": "deno coverage coverage --lcov > coverage.lcov"
  },
  "imports": {
    "@std/testing": "jsr:@std/testing@^0.225.0",
    "@std/assert": "jsr:@std/assert@^0.225.0"
  }
}
```

### 5.3 Playwright (E2E)

```typescript
// e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
```

---

## 6. Estrategia de Mocks

### Frontend (Vitest)

```typescript
// Ejemplo: Mock de Supabase client
import { vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [], error: null })
    }))
  }
}))
```

### Edge Functions (Deno)

```typescript
// Ejemplo: Mock de fetch para Anthropic API
import { stub } from "@std/testing/mock"

const fetchStub = stub(globalThis, "fetch", () =>
  Promise.resolve(new Response(JSON.stringify({ content: "mocked" })))
)
```

### E2E (Mock Service Worker)

```typescript
// e2e/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.post('*/functions/v1/chat', () => {
    return HttpResponse.json({
      status: 'ok',
      data: { respuesta: 'Mock response for E2E' }
    })
  })
]
```

---

## 7. TDD Workflow

```
┌─────────────────────────────────────┐
│  1. RED: Escribir test que falla    │
├─────────────────────────────────────┤
│  2. GREEN: Implementar mínimo       │
├─────────────────────────────────────┤
│  3. REFACTOR: Mejorar sin romper    │
└─────────────────────────────────────┘
```

### Ejemplo TDD para Edge Function

```typescript
// 1. RED - Escribir test primero
// supabase/functions/chat/handlers.test.ts
import { assertEquals } from "@std/assert"
import { validateChatRequest } from "./handlers.ts"

Deno.test("validateChatRequest - rechaza sin convenio_id", () => {
  const result = validateChatRequest({ pregunta: "test" })
  assertEquals(result.valid, false)
  assertEquals(result.error, "convenio_id is required")
})

// 2. GREEN - Implementar
// supabase/functions/chat/handlers.ts
export function validateChatRequest(body: unknown) {
  if (!body?.convenio_id) {
    return { valid: false, error: "convenio_id is required" }
  }
  return { valid: true }
}

// 3. REFACTOR - Mejorar tipado, extraer constantes, etc.
```

---

## 8. Scripts NPM

```json
// package.json (root)
{
  "scripts": {
    "test": "playwright test",
    "test:unit": "vitest run --config vitest.unit.config.ts",
    "test:deno": "deno test --allow-all --config supabase/functions/deno.json supabase/functions",
    "test:storybook": "vitest run --project storybook",
    "test:ci": "pnpm test:storybook && pnpm test:unit && pnpm test:deno && pnpm test"
  }
}
```

### Política de ejecución recomendada

1. **PR de UI/Componentes:** ejecutar `test:storybook`.
2. **PR de lógica frontend:** ejecutar `test:unit`.
3. **PR backend Edge Functions:** ejecutar `test:deno`.
4. **PR de flujos críticos:** ejecutar `test` (Playwright).

---

## 9. CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - uses: denoland/setup-deno@v1
        with:
          deno-version: v1.x

      - run: pnpm install
      - run: pnpm test:unit
      - run: pnpm test:storybook
      - run: pnpm test:deno
      - run: pnpm test
---

## 10. Prioridad de Implementación

1. **Fase 1:** Mantener Storybook tests para contratos de UI (`*.stories.*`)
2. **Fase 2:** Mantener y ampliar tests de frontend en `test:unit` (`*.test.ts(x)`)
3. **Fase 3:** Consolidar cobertura de Edge Functions con `test:deno`
4. **Fase 4:** Ejecutar gates completos en CI (`test:storybook` + `test:unit` + `test:deno` + `test`)

---

## Referencias

- [Vitest Documentation](https://vitest.dev/)
- [Deno Testing](https://docs.deno.com/runtime/manual/basics/testing/)
- [Playwright Documentation](https://playwright.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [MSW - Mock Service Worker](https://mswjs.io/)
