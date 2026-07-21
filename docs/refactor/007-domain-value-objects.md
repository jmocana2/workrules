# Refactor 007 — Value Objects de dominio (backend Supabase)

**Fecha:** 2026-07-21
**Alcance:** `supabase/functions/_shared/` (Deno Edge Functions)
**Base:** [`docs/arquitectura/clean-architecture-analysis.md`](../arquitectura/clean-architecture-analysis.md) §4 y §6
**Paradigma:** TypeScript funcional — VOs como **branded types + smart constructors** que devuelven `Result<T, E>`. Sin clases.
**Objetivo:** encapsular invariantes hoy dispersas en `data-classifier.ts`, `variable-extractor.ts` y constantes sueltas dentro de una capa `domain/` reutilizable, y eliminar la validación *a posteriori*.

---

## Estado (actualizado 2026-07-21)

| Fase | Estado | Notas |
|------|--------|-------|
| 0 – Result | ✅ Completa | 13 tests |
| 1 – labor-law | ✅ Completa | `LEGAL_LIMITS` + `SMI_2026` reexportados desde `data-classifier.ts` |
| 2 – IDs | ✅ Completa | `ConvenioId` / `UserId` / `SessionId` con UUID v4 |
| 3 – Magnitudes | ✅ Completa | 6 VOs escalares (44 tests) |
| 4 – Jornada | ✅ Completa | Invariante `completa ⇒ horas ≥ 35` movida al VO |
| 5 – Perfil | ✅ Completa | `Perfil` como anti-corruption layer, 3 invariantes |
| 6 – Intent + StateMachine | ✅ Completa | `QueryIntent` + `DataState.fromChecks` |
| 7 – ChatCommand | ✅ Completa | `toChatCommand` + `InvalidChatInput` tipado |
| 8a – Router validator | ✅ Completa | **Primer cambio de comportamiento**: `classifyAndExecute` valida con `toChatCommand` antes de cuota/cache/RAG |
| 8b – Firma `ChatCommand` en use cases | ⏸ Diferida | Requiere mover fetch de perfil, migrar `variable-adapters`, actualizar tests de use cases |
| 9 – Colapsar `data-classifier` | ⏸ Parcial | `checkInvalidVariables` y regla jornada de `checkConflicts` conservadas con comentarios que señalan la duplicidad; eliminación real pendiente de 8b |

**Suite completa:** 463 tests deno verdes, `pnpm lint` limpio.

---

## 1. Motivación (resumen del análisis)

El análisis de arquitectura identificó cuatro problemas concretos que un VO resuelve limpiamente:

1. **`ExtractedVariables` es `Record<string, string | number | undefined>`** → cualquier clave/valor cuela. No hay garantía de dominio.
2. **`LEGAL_LIMITS` y `SMI_2026` viven junto al clasificador de chat** → son política legal española, no reglas del use case. Bloquean su reutilización fuera de `chat/`.
3. **`checkInvalidVariables` valida a posteriori** valores que nunca deberían haberse construido (números negativos, `NaN`, horas > 40…). Un VO **hace imposible construir un valor inválido**.
4. **Reglas cross-field como `jornada.completa ⇒ horas ≥ 35`** están sueltas en `checkConflicts`; deberían ser invariante del propio VO `Jornada`.

Meta final: `data-classifier.checkInvalidVariables` desaparece; `checkConflicts` se reduce a lo estrictamente multi-campo; el use case recibe un `ChatCommand` con VOs ya validados y no vuelve a preocuparse por `NaN` ni rangos.

---

## 2. Estructura destino

```
supabase/functions/_shared/
  domain/
    result.ts                          # Result<T,E> helper (ok/err/isOk/map/chain)
    labor-law/
      legal-limits.ts                  # LEGAL_LIMITS extraído de data-classifier
      smi.ts                           # SMI_2026 + validateAgainstSMI
      index.ts
    value-objects/
      horas-semanales.ts
      horas-extra-anuales.ts
      horas-nocturnas.ts
      antiguedad-anos.ts
      jornada.ts                       # enum + invariante compuesta con horas
      salario-bruto.ts
      importe-euros.ts
      convenio-id.ts                   # UUID v4
      user-id.ts
      session-id.ts
      index.ts
    perfil/
      variable-critica.ts              # incluye clasificación identificadora/moduladora
      categoria-profesional.ts
      perfil.ts                        # invariantes: ≥1 crítica, valores_posibles ⊂ críticas
      index.ts
    chat-command/
      chat-command.ts                  # VO agregado: request DTO → command validado
      input-mapper.ts                  # ChatRequest → Result<ChatCommand, InvalidChatInput>
      index.ts
  core/chat/                           # use cases importan desde domain/
```

Regla de dependencias: **`domain/` no importa nada de `core/`, `lib/` ni `http/`**. Sólo Deno stdlib y otros módulos de `domain/`.

---

## 3. Plan paso a paso

Diez fases pequeñas, cada una es un PR independiente y no rompe comportamiento hasta la fase 8.

### Fase 0 — Andamiaje ✅

- [x] Crear `domain/result.ts` con `Result<T,E>`, `ok`, `err`, `isOk`, `isErr`, `map`, `chain`, `unwrapOr`. Añadido también `mapErr`.
- [x] Añadir tests unitarios de `Result` (Deno test) — 13 tests.
- [x] Documentar en el propio `result.ts` que **no se lanzan excepciones desde `domain/`**: todo error se devuelve.

**Criterio de éxito:** `deno test domain/result.test.ts` verde. Cero imports desde `core/`.

### Fase 1 — Mover política legal a `domain/labor-law/` ✅

Motivo: hoy `LEGAL_LIMITS` y `SMI_2026` son constantes sueltas en `data-classifier.ts` (~líneas 40–90). Son **derecho positivo español**, no reglas del chat.

- [x] Crear `domain/labor-law/legal-limits.ts` moviendo `LEGAL_LIMITS` verbatim + comentarios de artículos ET (34.1, 35.2…).
- [x] Crear `domain/labor-law/smi.ts` con `SMI_2026` y `validateAgainstSMI`. **Nota:** la firma se mantiene imperativa (`SMIValidationResult`) para no romper callers; la variante `Result<void, SmiViolation>` se aplicará cuando `ChatCommand` la consuma.
- [x] En `data-classifier.ts`, reemplazar las constantes por reexport desde `domain/labor-law/`.
- [x] Sin cambios de comportamiento; sólo movimiento.

**Criterio de éxito:** todos los tests existentes (`data-classifier.test.ts`, `handlers.test.ts`) pasan sin modificar aserciones.

### Fase 2 — VO `ConvenioId`, `UserId`, `SessionId` ✅

Motivo: son el punto de entrada del use case y hoy son `string` desnudo. Empezar por aquí porque son triviales y ejercitan el patrón sin tocar reglas de negocio complejas.

- [x] `domain/value-objects/convenio-id.ts` — brand type + `makeConvenioId(s: string): Result<ConvenioId, ConvenioIdError>`.
- [x] Idem `user-id.ts`, `session-id.ts`. Regex UUID v4 compartida en `value-objects/uuid.ts`.
- [x] Tests para: UUID v4 válido, string vacío, string arbitrario, mayúsculas/minúsculas (normalización a lowercase), UUID v1, whitespace, malformado.
- [x] **No** integrar aún en `types.ts` — se hizo parcialmente en Fase 8a (validación en router).

**Criterio de éxito:** cobertura de casos límite del §5.5 del análisis.

### Fase 3 — VOs de magnitudes escalares ✅

Uno por commit para revisar en aislado.

- [x] `horas-semanales.ts` — invariante `1 ≤ n ≤ 40`, sólo múltiplos de 0.5.
- [x] `horas-extra-anuales.ts` — `0 ≤ n ≤ 80`, entero.
- [x] `horas-nocturnas.ts` — `n ≥ 0`. La invariante cross-field (`≤ horasSemanales * 52`) vive en `ChatCommand` (fase 7).
- [x] `antiguedad-anos.ts` — `0 ≤ n ≤ 50`. **Decisión registrada en el fichero:** se aceptan decimales de 0.5 (medio año); otras fracciones se rechazan.
- [x] `importe-euros.ts` — `n ≥ 0`, precisión 2 decimales, redondeo bancario (half-to-even), factory desde `number` y desde string es-ES con heurística para desambiguar `1.234` vs `12.34`.
- [x] `salario-bruto.ts` — envuelve `ImporteEuros` con brand adicional; intercepta `NaN`/`Infinity`.

Cada VO tiene su `*.test.ts` con la tabla de casos límite del §4.1 del análisis.

**Criterio de éxito:** `deno test domain/value-objects/` verde. Cada test cubre al menos: valor válido mínimo, valor válido máximo, valor bajo mínimo, valor sobre máximo, `NaN`, `Infinity`, negativo, no numérico.

### Fase 4 — VO compuesto `Jornada` ✅

Motivo: la invariante `completa ⇒ horas ≥ 35` está hoy en `checkConflicts` (`data-classifier.ts:200-231`). Debería vivir en el constructor del propio `Jornada`.

- [x] `domain/value-objects/jornada.ts`:
  - Tipo `TipoJornada = "completa" | "parcial"`.
  - Smart constructor `makeJornada(tipo, horas: HorasSemanales): Result<Jornada, JornadaError>`.
  - Errores tipados: `"completa_con_horas_bajas"`, `"parcial_con_horas_completas"`.
- [x] Test para cada combinación (completa/35h ✅, completa/30h ❌, parcial/40h ❌, parcial/20h ✅) + frontera 39.5h + verificación del brand.
- [x] En `checkConflicts`, comentario que marca la regla como duplicada con `Jornada` VO. Eliminación real diferida a fase 9 completa (tras 8b).

**Criterio de éxito:** los 4 casos anteriores se pueden testear sin importar `data-classifier`.

### Fase 5 — VOs de perfil ✅

Los más frágiles del análisis (§3.2, §5.6, §5.7). Aquí está la deuda urgente.

- [x] `variable-critica.ts`:
  - Campos: `nombre` normalizado (sin acentos, snake_case), `clase: "identificadora" | "moduladora"`.
  - `isIdentifying(v)` como función libre sobre el VO (elimina la lógica de `isIdentifyingCritical`).
- [x] `categoria-profesional.ts`: nombre no vacío + sinónimos no vacíos individualmente + salarios finitos + mapping a camelCase.
- [x] `perfil.ts`:
  - Smart constructor `makePerfil(raw: unknown): Result<Perfil, PerfilError>`.
  - Invariantes: `variables_criticas.length ≥ 1`; `∀ v ∈ valores_posibles: v.variable ∈ variables_criticas` (con normalización); `categorias_profesionales` con nombres únicos (case-insensitive).
  - Es la **anti-corruption layer** contra el JSON del indexer n8n.
- [x] Tests con fixtures inspirados en los tests reales del proyecto (12 tests en `perfil.test.ts`, cubren cada invariante en positivo y negativo).

**Criterio de éxito:** todas las funciones de `data-classifier.ts` y `variable-extractor.ts` que hoy leen `perfil.variables_criticas` como `unknown` pueden migrarse a tipo `Perfil` sin `any`.

### Fase 6 — `QueryIntent` y `DataStateMachine` ✅

Motivo: §4.4 análisis. Hoy son `if/else` sueltos.

- [x] `domain/value-objects/query-intent.ts` con `classifyQueryIntent(message, hasProfileData): QueryIntent`. Encapsula regex de salario + patrones informativos, normaliza acentos. `hasProfileData=true` sesga a `salary_calculation` salvo pregunta informativa explícita.
- [x] `domain/value-objects/data-state.ts` con `fromChecks({invalidCount, conflictingCount, missingCount})`. Precedencia `invalid > conflicting > incomplete > complete`.
- [x] Tests: 10 para `QueryIntent`, 8 para `DataState` (cada transición + cada colisión de precedencia).
- [ ] Integración en `data-classifier` (sustituir `determineState`): pendiente de fase 8b.

**Criterio de éxito:** `data-classifier.determineState` desaparece; el clasificador delega en `DataState.from`.

### Fase 7 — `ChatCommand` (input validado del use case) ✅

Motivo: §6 paso 2 del análisis. Punto único donde el DTO HTTP se convierte en dominio.

- [x] `domain/chat-command/chat-command.ts` — tipo agregado: `{ convenioId, userId, sessionId?, intent, pregunta, variables?: ExtractedVariablesVO, messages?, stream }`.
- [x] `domain/chat-command/input-mapper.ts`:
  - Firma: `toChatCommand(req: ChatRequestRaw, perfil?: Perfil): Result<ChatCommand, InvalidChatInput>` (`perfil` opcional para permitir validación pre-fetch en fase 8a).
  - Invariantes cross-field cubiertas: `horasNocturnas ≤ horasSemanales * 52`, `jornada + horasSemanales` coherentes (delegado a `Jornada` VO).
  - `InvalidChatInput` como discriminated union para permitir mapeo preciso a mensajes HTTP.
- [x] 15 tests de mapeo (request mínimo, session_id, variables completas, string numérica es-ES, `mode=salary`, y 10 casos de error por campo/cross-field).

**Criterio de éxito:** el use case `ask-question` puede escribirse como `toChatCommand(req, perfil).chain(runAskQuestion)` sin ver el DTO crudo.

### Fase 8 — Integración en use cases (**primer cambio de comportamiento**)

Fase dividida en dos sub-fases por su tamaño y riesgo.

#### Fase 8a — Validación en el router ✅

- [x] `use-case-router.classifyAndExecute` llama a `validateChatCommand` como primera operación. Si falla, responde `invalid_data` **antes** de tocar cuota/cache/RAG.
- [x] `routing/command-validator.ts` traduce cada variante de `InvalidChatInput` a un `CalculateSalaryInvalid` con `invalidVariables[].reason` **tipada** (`horasSemanales_below_minimum`, `not_uuid`, `completa_con_horas_bajas`, `horas_nocturnas_exceden_base_anual`, etc.).
- [x] 5 tests en `command-validator.test.ts` cubren el criterio de éxito: `{"horas_semanales": -5}` → `invalid_data` con `reason: horasSemanales_below_minimum`.
- [x] Sin cambios en la firma de `ask-question` / `calculate-salary`: siguen recibiendo `ChatRequest`.

**Criterio de éxito cumplido:** `deno test` completo verde (463/463), `pnpm lint` limpio. El request `{"horas_semanales": -5}` responde `invalid_data` con `reason: "horasSemanales_below_minimum"` en vez del genérico anterior.

#### Fase 8b — Firma `ChatCommand` en use cases ⏸ Diferida

Requiere una sesión dedicada. Alcance pendiente:

- [ ] Mover el fetch de `Perfil` (`getPerfilByConvenio`) desde el interior de los use cases al router, para poder invocar `toChatCommand(req, perfil)` con perfil real.
- [ ] Cambiar `AskQuestionInput` y `CalculateSalaryInput` a recibir `ChatCommand` en vez de `ChatRequest` / campos sueltos.
- [ ] Reescribir `variable-adapters.ts` para consumir `ExtractedVariablesVO` en lugar de `Record<string, string | number>`.
- [ ] Adaptar `handlers.ts` y `result-mapper.ts` si es necesario.
- [ ] Actualizar tests de integración: `ask-question.test.ts`, `calculate-salary.test.ts`, `handlers.test.ts` — sus fixtures usan `convenio_id: "test-convenio-id"` (no UUID), así que habrá que rehacer los fixtures a UUID v4 reales.

**Riesgo:** alto. Diff estimado grande, varios ciclos de fix probables. Recomendado abrir un refactor 008 dedicado.

### Fase 9 — Colapsar `data-classifier` ⏸ Parcial

Meta del §6 paso 3: `checkInvalidVariables` desaparece.

Estado actual:

- [ ] Borrar `checkInvalidVariables` — **no ejecutado**. Se conserva porque el path natural-language dentro de `calculateSalary` (variables extraídas del texto de la pregunta, no del campo `variables` explícito) todavía depende de esta función; fase 8a solo valida el campo `variables` explícito. La eliminación real requiere que fase 8b haya migrado la extracción al pipeline de VOs.
- [x] `checkConflicts` — comentarios que marcan la regla jornada como duplicada con `Jornada` VO, pendientes de eliminar tras 8b.
- [x] Añadida documentación en cabecera de `data-classifier.ts` explicando la redundancia intencional.
- [ ] `data-classifier.ts` pasa de ~200 líneas a ~50: **no ejecutado**, sigue en ~470 líneas.

**Criterio de éxito diferido a la sesión que ejecute fase 8b.**

---

## 4. Convenciones de código

**Smart constructor estándar:**

```ts
// domain/value-objects/horas-semanales.ts
import { Result, ok, err } from "../result.ts";

export type HorasSemanales = number & { readonly __brand: "HorasSemanales" };

export type HorasSemanalesError =
  | { kind: "not_finite" }
  | { kind: "below_minimum"; min: 1 }
  | { kind: "above_legal_max"; max: 40; source: "Art. 34.1 ET" }
  | { kind: "not_half_hour_step" };

export function makeHorasSemanales(n: number): Result<HorasSemanales, HorasSemanalesError> {
  if (!Number.isFinite(n)) return err({ kind: "not_finite" });
  if (n < 1) return err({ kind: "below_minimum", min: 1 });
  if (n > 40) return err({ kind: "above_legal_max", max: 40, source: "Art. 34.1 ET" });
  if ((n * 2) % 1 !== 0) return err({ kind: "not_half_hour_step" });
  return ok(n as HorasSemanales);
}
```

**Reglas para todo VO nuevo:**
1. Branded type (nunca `type X = number` a secas).
2. Constructor devuelve `Result` — nunca lanza.
3. Errores como *tagged union* (`kind`), no strings sueltos. Facilita el mapeo a mensajes i18n en el borde HTTP.
4. Test con la tabla de casos límite del §4.1 del análisis, mínimo 6 casos.
5. Cero imports fuera de `domain/`.

---

## 5. Migración incremental — cómo no romper nada

- Cada fase 0–7 **no modifica** el comportamiento observable. Los VOs se construyen pero se descartan tras validar, en paralelo al código actual. Sólo la fase 8 conecta el VO al flujo real.
- Feature flag no necesario: el cambio de fase 8 sustituye validación por validación, con formato de error más rico. Si algo se rompe, revertir la fase 8 es un `git revert` de un solo PR.
- Los tests de `data-classifier` se conservan **hasta la fase 9**. Redundancia intencional durante la migración.

---

## 6. Casos límite que la refactor debe cerrar (checklist para QA)

Del §5 del análisis. Estado tras fase 8a:

- [x] `horas_semanales = 40.5` → `invalid_data` con `above_legal_max` (el VO rechaza fracciones > 40; `not_half_hour_step` cubre 37.25). Cubierto en `input-mapper.test.ts`.
- [x] `horas_nocturnas > horas_semanales * 52` → `invalid_data` desde `ChatCommand`. Cubierto en `command-validator.test.ts`.
- [x] `antiguedad_anos = 2.5` → aceptado; `2.3` rechazado con `not_half_year_step`. Decisión documentada en el VO.
- [x] `salario_mensual = NaN` devuelto por LLM → interceptado por `SalarioBruto`. Cubierto en `salario-bruto.test.ts`.
- [x] `convenio_id` malformado → `invalid_data` con `not_uuid`. Cubierto en `command-validator.test.ts` (mensaje: `"convenio_id invalido: not_uuid"`).
- [x] `perfil.variables_criticas = []` → `makePerfil` devuelve `variables_criticas_empty`. Cubierto en `perfil.test.ts`. **Nota:** no se invoca en runtime todavía (fase 8b integra `makePerfil` en el flujo real).
- [x] Variable crítica ausente de `valores_posibles` → `makePerfil` devuelve `valor_posible_no_critica`. Cubierto en `perfil.test.ts`. Misma nota que arriba.
- [ ] `jornada.completa` + `horas_semanales = 40` + `horas_extra = 5` semanales → **pendiente**. Requiere que `ExtractedVariablesVO` distinga horas extra semanales vs anuales; hoy `HorasExtraAnuales` asume base anual.

---

## 7. Fuera de alcance

- **Entidades** (`Conversación`, `Nómina`): se posponen (§7 análisis).
- **Frontend `src/`**: no se toca. Sólo `core/types/` seguirá reflejando el DTO. Ver §1.2 del análisis.
- **Cambios en el schema Supabase**: no hay migraciones.
- **`prompts.ts`**: la separación `normalizePerfilContexto` (dominio) vs `buildSystemPrompt` (infra) queda para un refactor posterior — se registra pero no se aborda aquí.

---

## 8. Estimación

| Fase | PRs | Riesgo |
|------|-----|--------|
| 0. Result | 1 | Nulo |
| 1. labor-law | 1 | Bajo (solo mover) |
| 2. IDs | 1 | Bajo |
| 3. Magnitudes | 3–6 | Bajo (por VO) |
| 4. Jornada | 1 | Medio (invariante compuesta) |
| 5. Perfil | 2 | **Alto** (anti-corruption real) |
| 6. Intent + StateMachine | 1 | Medio |
| 7. ChatCommand | 1 | Medio |
| 8. Integración | 1 | **Alto** (primer cambio de comportamiento) |
| 9. Colapso classifier | 1 | Bajo |

Total: ~13 PRs pequeños. Recomendado ejecutar fases 0–4 en un sprint, revalidar, y decidir si seguir con 5–9 según feedback.
