---
name: single-responsibility
description: Apply the Single Responsibility Principle (SRP) when designing, writing or reviewing functions, classes, React components, hooks, or modules. Use this skill whenever code is being authored or refactored in OOP or functional style — especially in src/ (React/TS) and supabase/functions/ (Deno/TS). Triggers: "new function", "new component", "new use case", "refactor", "split this", "is this clean?", "review this".
---

# Single Responsibility Principle — Pragmatic Guide

> "A module should have one, and only one, reason to change." — Robert C. Martin

This skill enforces SRP **pragmatically**: not every small mix-up matters. Optimize for *reasons to change*, not for line count.

---

## Core test before writing/accepting code

Ask three questions, in order:

1. **Reasons to change** — If I describe this unit out loud, do I need the word "and"?
   - ✅ "Validates a chat request."
   - ❌ "Validates a chat request **and** routes it **and** formats the SSE response."
2. **Audience of change** — Would two different roles (UX, backend dev, data engineer, security) ever edit this same file for unrelated reasons?
3. **Test isolation** — Can I unit-test this without mocking 3+ unrelated collaborators?

If any answer is bad → split.

---

## Heuristics by code type

### Functions
- A function name should be a verb + object. If you need `and` / `or` in the name, split.
- Mixing **I/O + pure logic** is the #1 SRP smell. Extract the pure core; keep the I/O thin at the edge.
- Side effects (DB, fetch, console, file system) belong in dedicated functions.

### Classes (OOP)
- The class should be nameable as a single noun (`SemanticCache`, `SseParser`, `RagOrchestrator`).
- Public method count > 7 → likely doing too much.
- Constructor injecting > 4 collaborators → likely an orchestrator pretending to be a domain object.

### React components
- A component does **one** of: layout, presentation of a piece of data, or container/wiring. Never all three.
- Smells: > 250 lines of JSX, > 5 `useEffect`, > 3 `useState` + data fetching + parsing in the same file.
- Split into: page → organism → molecule → atom. Move data fetching to hooks, parsing to pure utilities.

### React hooks
- A custom hook should expose one cohesive concern (auth, streaming, layout, persistence).
- A hook that returns > 6 fields is usually 2 hooks fused.
- Hooks that integrate **other hooks + format data + handle errors + persist** = split into smaller hooks composed at the call site.

### Modules / files
- Hard ceiling for review attention: **300 lines**. Above that, justify it.
- Group by *responsibility*, not by *kind*. Prefer `chat/cache.ts` over `chat/utils.ts`.

---

## When SRP does NOT apply (avoid over-engineering)

- Trivial wrappers (e.g. `lib/openai.ts` thin client).
- One-off scripts / migrations.
- UI primitives from a design library (`shadcn/`, `ai-elements/`).
- A function with 2 lines doing 2 things — splitting adds noise.

The cost of an extra abstraction must be paid by a real, recurring need.

---

## Refactor recipes

### Recipe A — "Function does I/O + logic"
```
Before: async function process(id) { fetch + parse + transform + save }
After:
  - fetch:    repository.get(id)
  - parse:    parsePayload(raw)         // pure
  - transform: applyRules(parsed)       // pure
  - save:     repository.save(result)
  - process:  composition only
```

### Recipe B — "React component too big"
1. Identify *layout* vs *content* vs *behaviour*.
2. Extract presentational children (no hooks, just props).
3. Move data-fetching to a hook.
4. Move parsing/formatting to a pure `*.ts` sibling file with its own test.

### Recipe C — "Hook doing too much"
1. List what it returns; group by concern.
2. Create N smaller hooks, compose them in a thin parent hook at the call site if needed.

### Recipe D — "Duplicated orchestration across use cases"
1. Identify the shared *flow* (sequence of steps).
2. Extract an orchestrator that takes the variant steps as injected functions or strategy objects.
3. Each use case keeps only its specific variance.

---

## Workflow when authoring code

1. **Before writing**: state in one sentence what the unit does. If it needs `and`, redesign.
2. **While writing**: stop at 100 lines or 3 side effects and re-check.
3. **Before committing**: re-read top-to-bottom. Can a new teammate predict what's in the file from its name?

## Workflow when reviewing code

1. Map the file to 1–3 responsibilities.
2. Flag any file > 300 lines explicitly.
3. Flag any function that mixes I/O with branching business logic.
4. Suggest the **smallest** split that removes one reason to change. Don't over-split.

---

## Project-specific references (WorkRules)

- Backend chat use cases live in `supabase/functions/_shared/core/chat/`. New flows should reuse a shared RAG orchestrator instead of copy-pasting embedding + cache + persistence.
- Frontend chat: keep `ChatPage.tsx` as composition only; data + streaming go in hooks under `src/ui/hooks/`; SSE parsing belongs in pure utilities under `src/lib/`.
- Latest audit: `docs/refactor/001-srp-audit.md`.

---

## Output expectations

When this skill is active, the assistant must:
- Apply the three-question test silently before writing any non-trivial function/component/hook.
- When refactoring, propose the *smallest* split that removes a reason to change.
- When reviewing, point to the exact responsibility being mixed, not just "this is too big".
- Be pragmatic: never split for the sake of splitting.
