# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WorkRules is a Spanish labor law consultation application for querying "Convenios Colectivos" (collective bargaining agreements). It features an AI-powered chat interface that can answer general questions about labor agreements and calculate salaries based on specific convenios.

## Development Commands

```bash
# Frontend (Vite + React)
pnpm dev           # Start dev server on port 5173
pnpm build         # Production build
pnpm lint          # Run ESLint
pnpm lint:fix      # Fix linting errors
pnpm typecheck     # TypeScript type checking

# Testing
pnpm test          # Run Playwright e2e tests
pnpm test:ui       # Playwright with UI
pnpm test:deno     # Run Supabase Edge Function tests (Deno)

# Storybook
pnpm storybook     # Start Storybook on port 6006

# Design Tokens
pnpm tokens:build  # Build CSS variables from design tokens
```

## Architecture

### Frontend (`src/`)
- **React 19** with **Vite 7** and **Tailwind CSS 4**
- Uses **Vercel AI SDK** (`@ai-sdk/react`) with `useChat()` for streaming chat
- State management: **Zustand** for local state, **TanStack Query** for server state
- UI components split into:
  - `ui/components/shadcn/` - Base shadcn/ui components (Radix-based)
  - `ui/components/ai-elements/` - AI chat-specific components (prompts, citations, reasoning)
  - `ui/components/workrules/` - Domain-specific components (atoms/molecules/organisms/pages)

### Backend (`supabase/functions/`)
- **Supabase Edge Functions** written in **Deno/TypeScript**
- Main endpoint: `POST /chat` - Classifies queries and routes to appropriate handler
- Shared code in `_shared/` follows a hexagonal layout:
  - `domain/` - Value objects, `ChatCommand`, reglas puras de dominio
  - `application/` - Use cases y contratos hexagonales
    - `application/ports/` - Interfaces neutrales + DTOs de puerto (`RetrievedChunk`, `ConvenioSummary`, `QuotaStatus`, `CacheHit`, `LlmChatRequest`)
    - `application/chat/` - Use cases (`ask-question`, `calculate-salary`), routing, http, sse, rag compartido
  - `infrastructure/` - Adapters concretos que implementan los puertos (`supabase/`, `anthropic/`, `openai/`); son thin wrappers sobre `lib/`
  - `lib/` - SDK clients crudos (Supabase, Anthropic, OpenAI) + utilidades genéricas (CORS). Consumido por adapters y por edge functions distintas de `chat/`
- Regla de dependencias: `application/` depende de `application/ports/`; nunca de `infrastructure/` ni de `lib/` (con excepciones anotadas: clases de error concretas usadas por `rag/error-mapper.ts`, `verifyUserToken` en `http/auth.ts`)
- Supports both JSON responses and SSE streaming

### Design System
- Tokens defined in `design-system/tokens/tokens.json`
- Built with Style Dictionary to `src/styles/tokens/variables.css`
- Custom transform for font weights (text to numeric)

## Path Aliases

```typescript
@/      -> src/
@core/  -> src/core/
@ui/    -> src/ui/
@lib/   -> src/lib/
```

## Key Files

- `src/App.tsx` - Main chat interface demo
- `src/lib/supabase.ts` - Supabase client singleton
- `supabase/functions/chat/index.ts` - Chat endpoint entry
- `supabase/functions/_shared/application/chat/handlers.ts` - Request classification and routing

## Project Skills

Skills locales en `.agents/skills/`. Invocarlas vía la herramienta Skill cuando aplique:

- **single-responsibility** — Aplicar SRP al escribir/revisar funciones, clases, componentes React, hooks o módulos en `src/` y `supabase/functions/`. Triggers: "nueva función", "nuevo use case", "refactor", "split this", "¿esto está limpio?".
- **frontend-developer** — Convenciones de estilo TS/React/Deno del repo: JSDoc solo en funciones exportadas y variables de configuración, separadores de sección, prohibición de barrels. Usar al crear/editar código en `src/` o `supabase/functions/`.
- **frontend-design** — Diseño de interfaces frontend con calidad de producción y estética distintiva (componentes, páginas, landings, dashboards). Usar cuando se pida construir o rediseñar UI con foco visual, no solo lógica.
- **frontend-responsive-design-standards** — Layouts mobile-first, breakpoints, unidades fluidas (rem/em/%), touch targets ≥44px. Usar al crear/modificar layouts, media queries, grids responsive o navegación móvil.
- **testing** — Pirámide de testing (unit/integración/e2e), TDD red-green-refactor, herramientas (Vitest, RTL, Playwright, `deno test`), coverage 100% funciones / 80% líneas, POM + mock server para e2e, selectores estables y esperas inteligentes. Usar al escribir o revisar tests en `src/` o `supabase/functions/`.

## Testing Supabase Functions Locally

```bash
# Start local Supabase
supabase start

# Test chat endpoint
curl -X POST 'http://127.0.0.1:54321/functions/v1/chat' \
  -H 'Authorization: Bearer <anon-key>' \
  -H 'Content-Type: application/json' \
  -d '{"convenio_id": "uuid", "pregunta": "..."}'
```

## Environment Variables

Frontend requires in `.env.local`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Edge Functions use Supabase-provided env vars plus API keys for OpenAI/Anthropic.
