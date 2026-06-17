# Buenas prácticas

<div class="grid grid-cols-5 gap-6 mt-2 items-start">
<div class="col-span-3 text-[11px] text-white/90 leading-tight">

**Calidad de código**

- **TypeScript estricto** — `strict: true`, sin `any` implícito.
- **ESLint** + **SonarJS** + plugin `react-hooks` — análisis estático en CI.
- **Husky** + lint-staged — pre-commit hook bloquea código con errores.

**Principios aplicados**

- **SOLID** — especialmente SRP (cada hook/servicio una responsabilidad).
- **DRY** sin sobre-ingeniería — abstraer cuando hay 3 repeticiones, no antes.
- **YAGNI** — no implementar nada sin caso de uso real.

**Trazabilidad y documentación**

- **Conventional Commits** — `feat:`, `fix:`, `refactor:`, etc.
- **ADRs** en `docs/adr/` para decisiones arquitectónicas importantes.
- **Storybook** como documentación viva del Design System.

</div>
<div class="col-span-2">
  <img src="https://images.unsplash.com/photo-1611224923853-80b023f02d71?auto=format&fit=crop&w=800&q=80" class="rounded-2xl shadow-2xl w-full h-[45vh] object-cover" alt="Checklist de calidad" />
</div>
</div>

<!--
Buenas prácticas en tres dimensiones: calidad de código, workflow, métricas.
Código: TypeScript con strict mode, ningún any implícito. ESLint con plugins de React, hooks y SonarJS — este último detecta code smells y bugs comunes. Husky con lint-staged corre el linter solo sobre los archivos modificados en cada commit, bloqueando el commit si hay errores. Esto mantiene la calidad sin ralentizar la iteración.
Principios SOLID aplicados pragmáticamente. El más útil en este proyecto es Single Responsibility: cada hook hace una cosa (useChat, useConvenio, useAuth). DRY con criterio — si veo tres repeticiones similares abstraigo, antes no. YAGNI — no metemos features sin caso de uso real.
Workflow: cada feature en su rama y su PR. CI obligatoria pasa antes de mergear. ADRs documentan decisiones que cuestan revertir (elegir Claude vs GPT, elegir pgvector vs Qdrant, etc.). CHANGELOG limpio en cada release.
Métricas: Lighthouse 93/100/100/100 en producción — performance algo por debajo del 100 por el peso del bundle de Vercel AI SDK, lo demás perfecto. Core Web Vitals todos en verde.
-->

---

# Testing

<div class="grid grid-cols-3 gap-4 text-sm mt-4">
<div class="border border-primary/30 rounded p-3">
<div class="font-bold text-primary mb-2">Unitarios</div>

**Frontend:** Vitest + Testing Library.

**Backend:** Deno test sobre `core/` (validadores, clasificadores, prompts).

Cobertura: la lógica de negocio se testea sin tocar Supabase ni Claude. Tests en milisegundos.

</div>
<div class="border border-primary/30 rounded p-3">
<div class="font-bold text-primary mb-2">Integración</div>

Edge Functions con Supabase local (CLI).

Mocks selectivos: stub de Anthropic/OpenAI para tests deterministas, real para tests de smoke.

</div>
<div class="border border-primary/30 rounded p-3">
<div class="font-bold text-primary mb-2">E2E</div>

**Playwright** sobre el frontend desplegado.

Flujos: login, selector de convenio, chat con respuesta, validación de errores.

Storybook tests con `@storybook/test-runner` para componentes.

</div>
</div>

<div class="mt-4 grid grid-cols-2 gap-4 text-xs">
<div class="border-l-2 border-primary pl-3">

**TDD donde duele más** — Tests escritos antes en validadores de salario, clasificador de estado y extractores de variables. La lógica frágil es la que tiene tests primero.

</div>
<div class="border-l-2 border-primary pl-3">

**Test cases del chatbot** documentados en `docs/tests/chatbot/`: C1 salario ayudante cocina, C2 recepcionista, C3 camarera pisos. Verificados contra PDF oficial.

</div>
</div>

<!--
Estrategia de testing en pirámide clásica: muchos unitarios, integración para boundary, E2E para flujos críticos.
Unitarios. Frontend con Vitest y Testing Library. Backend con Deno test directamente sobre core/ — validadores, clasificadores, prompts. La gran ventaja de tener la lógica de negocio aislada en core/ es que estos tests corren en milisegundos sin necesidad de levantar Supabase ni llamar a Claude. Determinista, rápido, barato.
Integración. Para las Edge Functions usamos Supabase CLI que levanta una instancia local completa. Mocks selectivos: para tests deterministas stubeamos Anthropic y OpenAI con respuestas fijas. Para tests de smoke puntuales llamamos al modelo real, pero son los menos.
E2E con Playwright contra el frontend desplegado en una preview de Vercel. Los flujos críticos están cubiertos: login, selector de convenio, hacer una pregunta y recibir respuesta, validación de errores. También hay Storybook test runner que asegura que ningún story rompe.
TDD aplicado donde realmente importa. No escribo tests primero para un componente de presentación tonto, pero sí para un validador de salario contra límites legales — ahí el error es caro y la lógica es frágil.
En docs/tests/chatbot/ hay tres casos documentados: C1 ayudante de cocina, C2 recepcionista, C3 camarera de pisos. Cada uno con datos de entrada, salida esperada (verificada manualmente contra el PDF oficial) y status. Esto es nuestra red de seguridad regresional para el LLM.
-->
