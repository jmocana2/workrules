# Métricas Accionables - WorkRules

**Versión:** 1.0 | **Fecha:** Febrero 2026 | **Filosofía:** Binary thresholds, no vanity metrics

---

## Principio Rector

> **30 segundos para saber si algo va mal.**
> Si una métrica no te dice qué hacer cuando cruza el umbral, elimínala.

---

## Sistema TIER

```
┌─────────────────────────────────────────────────────────────┐
│  TIER 1: CRÍTICAS                                           │
│  Detectan problemas ANTES de afectar usuarios               │
│  → Monitorizar en CADA deploy                               │
├─────────────────────────────────────────────────────────────┤
│  TIER 2: SALUD                                              │
│  Tendencias que predicen degradación                        │
│  → Revisar SEMANAL                                          │
├─────────────────────────────────────────────────────────────┤
│  TIER 3: CONTEXTO                                           │
│  Información para decisiones estratégicas                   │
│  → Revisar MENSUAL                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## TIER 1: Métricas Críticas

### 1.1 Test Success Rate

| Aspecto | Valor |
|---------|-------|
| **Qué mide** | % de tests que pasan en CI |
| **Threshold** | `< 100%` = BLOQUEO |
| **Acción si falla** | No hacer merge. Arreglar antes de continuar. |
| **Fuente** | GitHub Actions / CI pipeline |

```bash
# Comando de verificación
pnpm test:ci
# Exit code 0 = OK, cualquier otro = BLOQUEO
```

### 1.2 Build Success Rate

| Aspecto | Valor |
|---------|-------|
| **Qué mide** | % de builds exitosos |
| **Threshold** | `< 100%` = BLOQUEO |
| **Acción si falla** | Revertir último commit o arreglar inmediatamente |
| **Fuente** | Vercel / Supabase deploy logs |

### 1.3 Error Rate Edge Functions

| Aspecto | Valor |
|---------|-------|
| **Qué mide** | % de requests con status 5xx en Edge Functions |
| **Threshold** | `> 1%` = ALERTA, `> 5%` = CRÍTICO |
| **Acción si falla** | Revisar logs Supabase, identificar función afectada |
| **Fuente** | Supabase Dashboard > Edge Functions > Logs |

```sql
-- Query para Supabase (logs últimas 24h)
SELECT
  function_name,
  COUNT(*) FILTER (WHERE status >= 500) * 100.0 / COUNT(*) as error_rate
FROM edge_function_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY function_name;
```

### 1.4 Latencia RAG (P95)

| Aspecto | Valor |
|---------|-------|
| **Qué mide** | Tiempo de respuesta del chat (percentil 95) |
| **Threshold** | `> 8s` = ALERTA, `> 15s` = CRÍTICO |
| **Acción si falla** | Revisar: vector search, Claude API, cold starts |
| **Fuente** | Logs Edge Function `/chat` |

**Justificación del threshold:** Usuario espera respuesta streaming. >8s sin feedback = abandono.

---

## TIER 2: Métricas de Salud

### 2.1 Test Coverage (Functions)

| Aspecto | Valor |
|---------|-------|
| **Qué mide** | % de funciones cubiertas por tests |
| **Threshold** | `< 90%` = Deuda técnica acumulándose |
| **Acción si falla** | Añadir tests en próximo sprint |
| **Fuente** | Vitest coverage / Deno coverage |

### 2.2 Bundle Size (Frontend)

| Aspecto | Valor |
|---------|-------|
| **Qué mide** | Tamaño del bundle JS principal |
| **Threshold** | `> 200KB` gzipped = Revisar imports |
| **Acción si falla** | Auditar dependencias, implementar code splitting |
| **Fuente** | `pnpm build` output / Vercel analytics |

### 2.3 Cold Start Edge Functions

| Aspecto | Valor |
|---------|-------|
| **Qué mide** | Tiempo de inicialización tras inactividad |
| **Threshold** | `> 500ms` = Optimizar imports |
| **Acción si falla** | Lazy load de dependencias, reducir tamaño función |
| **Fuente** | Supabase Edge Function metrics |

### 2.4 API Cost Burn Rate

| Aspecto | Valor |
|---------|-------|
| **Qué mide** | Gasto acumulado Anthropic + OpenAI vs presupuesto mensual |
| **Threshold** | `> 80%` del budget antes del día 25 = ALERTA |
| **Acción si falla** | Revisar semantic cache, ajustar límites Free tier |
| **Budget mensual** | ~50€ APIs (de 100€ total) |

```
Fórmula: (gasto_actual / presupuesto) * 100
Si día_del_mes < 25 AND burn_rate > 80% → ALERTA
```

---

## Coverage Estratégico: Sistema 100/80/0

> **No todo el código merece tests.** Invertir tiempo en testear código trivial es deuda técnica disfrazada de buenas prácticas.

### El Sistema

```
┌─────────────────────────────────────────────────────────────┐
│  CORE (100%)                                                │
│  Lógica de negocio crítica                                  │
│  → Si falla, el usuario pierde dinero o datos               │
├─────────────────────────────────────────────────────────────┤
│  IMPORTANT (80%)                                            │
│  Features visibles al usuario                               │
│  → Si falla, el usuario se frustra                          │
├─────────────────────────────────────────────────────────────┤
│  INFRASTRUCTURE (0%)                                        │
│  Auto-validable por TypeScript/Linter                       │
│  → Tipos, constantes, configuración, re-exports             │
└─────────────────────────────────────────────────────────────┘
```

### Mapeo para WorkRules

#### CORE (100%) - Cero tolerancia a fallos

| Módulo | Justificación |
|--------|---------------|
| `calculator.ts` | Cálculos salariales. Error = problema legal. |
| `validators.ts` | Validación de inputs del chat. |
| `rag-pipeline.ts` | Lógica de búsqueda vectorial + contexto. |
| `smi-check.ts` | Validación contra Salario Mínimo. |
| `profile-parser.ts` | Parsing del Perfil JSON del convenio. |

```typescript
// Ejemplo: Este código DEBE tener 100% coverage
export function calcularSalarioBruto(
  salarioBase: number,
  horasExtra: number,
  recargoExtra: number
): number {
  // Cada rama debe estar testeada
  if (horasExtra < 0) throw new ValidationError("Horas extra inválidas")
  if (horasExtra > 80) throw new ValidationError("Excede límite legal anual")

  const valorHoraExtra = (salarioBase / 1826) * (1 + recargoExtra)
  return salarioBase + (horasExtra * valorHoraExtra)
}
```

#### IMPORTANT (80%) - Cubrir happy path + edge cases críticos

| Módulo | Justificación |
|--------|---------------|
| `ChatInput.tsx` | Componente principal de interacción. |
| `ChatMessage.tsx` | Renderizado de respuestas con streaming. |
| `ConvenioSelector.tsx` | Selección de convenio por usuario. |
| `useChat.ts` | Hook principal de estado del chat. |
| `edge-function/chat` | Handler principal de la API. |

```typescript
// Ejemplo: 80% coverage - cubrir casos importantes
describe("ChatInput", () => {
  it("envía mensaje al presionar Enter")           // Happy path ✓
  it("no envía mensaje vacío")                     // Edge case ✓
  it("muestra loading mientras espera respuesta")  // UX crítico ✓
  // NO testear: estilos CSS, orden de props, etc.
})
```

#### INFRASTRUCTURE (0%) - TypeScript ya lo valida

| Módulo | Por qué 0% |
|--------|------------|
| `types.ts` | TypeScript valida en compile time. |
| `constants.ts` | Valores estáticos, sin lógica. |
| `supabase-client.ts` | Config de cliente, testeado por Supabase. |
| `tailwind.config.js` | Config de estilos. |
| `env.ts` | Variables de entorno con Zod (valida en runtime). |
| `index.ts` (re-exports) | Solo barrel files. |

```typescript
// Ejemplo: Este código NO necesita tests
// types.ts
export interface ConvenioProfile {
  id: string
  nombre: string
  variables_criticas: string[]
}

// constants.ts
export const MAX_HORAS_EXTRA_ANUALES = 80
export const JORNADA_ANUAL_ESTANDAR = 1826

// Re-export barrel
export * from "./validators"
export * from "./calculator"
```

### Configuración de Coverage por Carpeta

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      // Thresholds diferenciados
      thresholds: {
        // CORE: 100%
        'src/**/core/**': {
          functions: 100,
          branches: 100,
          lines: 95
        },
        // IMPORTANT: 80%
        'src/components/**': {
          functions: 80,
          lines: 70
        },
        'src/hooks/**': {
          functions: 80
        },
        // INFRASTRUCTURE: Excluido
        'src/types/**': {
          functions: 0
        }
      },
      exclude: [
        'src/types/**',
        'src/constants/**',
        'src/**/index.ts',
        '**/*.d.ts',
        '**/env.ts'
      ]
    }
  }
})
```

### Decisión Rápida: ¿Debo testear esto?

```
¿El código toma decisiones basadas en datos del usuario?
  └─ SÍ → ¿Un bug causaría pérdida de dinero/datos/confianza?
           └─ SÍ → CORE (100%)
           └─ NO → IMPORTANT (80%)
  └─ NO → ¿Es solo configuración, tipos o re-exports?
           └─ SÍ → INFRASTRUCTURE (0%)
           └─ NO → IMPORTANT (80%)
```

### Anti-patrones a Evitar

| Anti-patrón | Por qué es malo |
|-------------|-----------------|
| Testear getters/setters triviales | Infla coverage sin valor |
| Testear que React renderiza | RTL ya lo garantiza |
| Testear llamadas a librerías externas | Responsabilidad de la librería |
| Tests que solo verifican que no hay errores | No prueban comportamiento |
| Mocks que replican la implementación | Test frágil, no detecta bugs reales |

---

## TIER 3: Métricas de Contexto

### 3.1 Precisión RAG

| Aspecto | Valor |
|---------|-------|
| **Qué mide** | % de respuestas con cita correcta al artículo del convenio |
| **Threshold** | `< 95%` = Revisar prompts o chunks |
| **Frecuencia** | Mensual (sample de 50 consultas) |
| **Método** | Revisión manual o automated eval |

### 3.2 Cache Hit Rate

| Aspecto | Valor |
|---------|-------|
| **Qué mide** | % de consultas servidas desde semantic cache |
| **Threshold** | `< 30%` = Cache infrautilizado |
| **Acción si falla** | Revisar estrategia de cache, ajustar similarity threshold |

### 3.3 Pipeline Success (n8n)

| Aspecto | Valor |
|---------|-------|
| **Qué mide** | % de PDFs procesados correctamente |
| **Threshold** | `< 95%` = Revisar LlamaParse o chunking |
| **Fuente** | n8n execution logs |

### 3.4 Core Web Vitals

| Métrica | Threshold |
|---------|-----------|
| **LCP** | `< 2.5s` |
| **FID** | `< 100ms` |
| **CLS** | `< 0.1` |

**Fuente:** Vercel Analytics / Lighthouse CI

---

## Dashboard de 30 Segundos

```
┌─────────────────────────────────────────────────────────────┐
│  WORKRULES HEALTH                              [Actualizado]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  TIER 1 - CRÍTICAS                                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ Tests: 100% │ │ Build: OK   │ │ Errors: 0.2%│           │
│  │     ✓       │ │     ✓       │ │     ✓       │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                             │
│  ┌─────────────┐                                            │
│  │ Latency P95 │                                            │
│  │    4.2s ✓   │                                            │
│  └─────────────┘                                            │
│                                                             │
│  TIER 2 - SALUD                                             │
│  Coverage: 92% ✓  │  Bundle: 156KB ✓  │  API Cost: 45% ✓   │
│                                                             │
│  [Ver detalles TIER 3]                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementación Práctica

### Fase 1: Mínimo Viable (Ahora)

```yaml
# .github/workflows/metrics.yml
name: Metrics Check
on: [push, pull_request]

jobs:
  tier1:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Test Success Rate
      - run: pnpm test:ci

      # Build Success
      - run: pnpm build

      # Coverage threshold
      - run: pnpm test:coverage
      - name: Check coverage
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.functions.pct')
          if (( $(echo "$COVERAGE < 90" | bc -l) )); then
            echo "Coverage below 90%: $COVERAGE"
            exit 1
          fi
```

### Fase 2: Monitoring Producción

1. **Supabase Logs:** Habilitar logs detallados en Edge Functions
2. **Sentry/LogFlare:** Para tracking de errores en producción
3. **Cron job semanal:** Script que genera reporte TIER 2/3

### Fase 3: Dashboard Automatizado

Opciones ordenadas por complejidad:
1. **Notion + n8n:** Actualizar página Notion con métricas (gratis)
2. **GitHub README badges:** Status en tiempo real
3. **Grafana Cloud Free:** Para visualización avanzada

---

## Métricas Explícitamente Excluidas

| Métrica | Por qué NO |
|---------|------------|
| Commits/día | Vanity. No indica calidad ni progreso real. |
| Lines of Code | Vanity. Menos código suele ser mejor. |
| PRs mergeados | Solo-dev. No aplica. |
| "Uptime 99.9%" | Supabase/Vercel lo garantizan. No accionable. |
| Número de features | Vanity. Mejor 1 feature sólida que 10 rotas. |
| Tiempo en issues | No hay equipo. No accionable. |

---

## Alertas Recomendadas

| Evento | Canal | Prioridad |
|--------|-------|-----------|
| Test failure en main | GitHub notification | Inmediata |
| Error rate > 5% | Email / SMS | Crítica |
| API cost > 80% budget | Email | Alta |
| Build failure | GitHub notification | Inmediata |

---

## Checklist Pre-Deploy

```markdown
## Antes de cada deploy a producción:

- [ ] Tests pasan al 100%
- [ ] Build sin errores
- [ ] Coverage >= 90% functions
- [ ] Bundle size < 200KB gzipped
- [ ] Sin console.log residuales
- [ ] Variables de entorno verificadas
```

---

## Revisión de Métricas

| Frecuencia | Qué revisar | Acción |
|------------|-------------|--------|
| **Cada deploy** | TIER 1 completo | Gate automático en CI |
| **Semanal** | TIER 2 + tendencias | Ajustar prioridades |
| **Mensual** | TIER 3 + costes | Decisiones estratégicas |

---

## Referencias

- [Google SRE Book - Monitoring](https://sre.google/sre-book/monitoring-distributed-systems/)
- [Supabase Edge Functions Monitoring](https://supabase.com/docs/guides/functions/monitoring)
- [Vercel Analytics](https://vercel.com/docs/analytics)
