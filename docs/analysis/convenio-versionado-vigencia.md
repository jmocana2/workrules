# Análisis: Convenios del mismo sector con años distintos

**Fecha:** 2026-07-28
**Contexto:** Bug detectado en producción con dos convenios de Hostelería de Málaga (2022 y 2026) que aparecen en el selector sin diferenciar el año.

---

## 1. Problema observado

En `src/ui/components/workrules/organisms/ConvenioSelector/ConvenioSelector.tsx` los dos convenios se muestran así:

- `Hosteleria Malaga — Malaga y provincia`
- `Hosteleria Malaga — Provincia de Málaga`

El usuario **no puede distinguir qué convenio está vigente** ni **a qué año corresponde** cada uno. Además, si consulta el antiguo (2022), obtendrá información desactualizada sin ninguna señal en la UI.

### Sub-problemas identificados

1. **Falta de indicador de vigencia** en el selector.
2. **Falta del año/fecha** en la etiqueta visible.
3. **Modelo de datos no relaciona versiones del mismo convenio** entre sí (ver §3).
4. **El chat solo consulta un convenio a la vez**; si el 2026 es una *ampliación/modificación parcial* del 2022, la respuesta puede quedar incompleta.

---

## 2. Estado actual del modelo de datos

### Tabla `convenios` (schema.sql, migración inicial)

Campos relevantes ya existentes:
- `fecha_vigencia DATE` — fecha en que entra en vigor. NULL permitido.
- `estado` — enum con `activo | activo_sin_perfil | derogado | pendiente | archivado | procesando | error | rechazado`.
- `codigo_regcon` — código único del Registro de Convenios (UNIQUE cuando no NULL).
- `version VARCHAR(50) DEFAULT '1.0'`.
- `ambito`, `ambito_territorial`, `nombre_corto`, `nombre_oficial`.

### Tabla `convenio_versiones` (ya existe pero infrautilizada)

```
convenio_id, version, fecha_publicacion, url_boe, cambios_principales, is_current
```

Pensada para el BOE Watchdog. **No se está usando desde el flujo de subida manual**: cada PDF crea una fila nueva en `convenios` sin vincularse al convenio anterior del mismo sector/territorio.

### Frontend

`getDisplayName()` (ConvenioSelector.tsx:129-138) construye la etiqueta como:
```
{nombre_corto || nombre_oficial} — {ambito_territorial}
```

Sin ninguna referencia a `fecha_vigencia` ni a `estado`.

---

## 3. Análisis por eje

### 3.1 Vigencia — ¿está el convenio en vigor?

**Señal disponible hoy:** `estado` (`activo` vs `derogado` vs `archivado`) + `fecha_vigencia`.

**Problema:** en la subida manual nadie marca un convenio como `derogado` cuando se sube uno nuevo del mismo sector/territorio. Los dos quedan `activo`.

**Opciones:**

- **A. Marcar derogado automáticamente al subir uno más reciente del mismo (sector, ámbito_territorial).** Requiere una noción de "misma familia de convenio" (ver §3.3).
- **B. Marcar vigencia solo visualmente** en el selector calculando `is_latest` en el cliente comparando `fecha_vigencia` entre convenios con `codigo_regcon` o `(nombre_corto, ambito_territorial)` iguales. No modifica datos; menos riesgo.
- **C. Añadir campo `fecha_fin_vigencia`** para convenios con vigencia acotada explícita.

Recomendación mínima: **B primero** (no destructivo, solo cambia UI). **A** como paso siguiente cuando exista el concepto de "familia" (§3.3).

### 3.2 Mostrar el año en el selector

**Trivial de implementar.** En `getDisplayName()`:

```ts
const anio = convenio.fecha_vigencia
  ? new Date(convenio.fecha_vigencia).getFullYear()
  : null;

const base = corto || oficial;
const sufijo = territorial && anio ? `${territorial} · ${anio}`
             : territorial          ? territorial
             : anio                  ? String(anio)
             : '';
return sufijo ? `${base} — ${sufijo}` : base;
```

Además: **badge visual** "Vigente" / "Antiguo" junto al badge de ámbito, calculado a partir de §3.1.

Si `fecha_vigencia` es NULL (dato faltante para PDFs antiguos), habría que:
- Extraerla en el indexer (n8n) desde el propio texto del BOE, o
- Mostrar `created_at` como fallback etiquetado ("subido en {año}") — menos correcto pero informativo.

### 3.3 Relación entre convenios de la misma familia

Es el eje más ambiguo. Un convenio nuevo puede ser:

1. **Sustitución completa** del anterior (convenio 2026 reemplaza 2022 entero).
2. **Ampliación/modificación parcial** (acuerdo 2026 modifica solo la tabla salarial; el articulado del 2022 sigue vigente).
3. **Prórroga** (mismo texto, nueva vigencia).

Hoy el sistema **no distingue estos casos**. Cada subida es un convenio independiente y el chat opera sobre uno solo (`convenio_id` en el mensaje).

**Opciones de modelado:**

- **Opción 1 — Agrupar por `codigo_regcon`:** Si dos PDFs comparten código REGCON, son la misma familia. Ordenar por `fecha_vigencia DESC` y marcar el primero como vigente. **Ventaja:** el código REGCON es el identificador oficial y ya tenemos índice UNIQUE parcial (habría que relajarlo o migrar a `UNIQUE(codigo_regcon, version)`). **Limitación:** no cubre convenios privados/subidos sin código.
- **Opción 2 — Nueva tabla `convenio_familia`** (o campo `familia_id UUID` autorreferente en `convenios`): agrupación explícita. El indexer intenta autoasignar familia por match de (código, sector, territorio) y el usuario puede confirmar/mover.
- **Opción 3 — Reutilizar `convenio_versiones`:** poblarla también desde subidas manuales (hoy solo la usa el BOE Watchdog). Cada `convenios.id` sería una versión; un convenio "canónico" tendría hijos en `convenio_versiones` con `is_current`.

Recomendación: **Opción 1 como MVP** (código REGCON es la señal fuerte y ya está en el modelo), **Opción 2 como evolución** cuando aparezcan casos privados o sin código.

### 3.4 Consulta multi-convenio (ampliaciones)

Si aceptamos que el convenio 2026 puede ser una modificación parcial del 2022, el chat necesitaría:

1. **Modo "familia"**: al seleccionar un convenio, el retriever busca chunks en toda la familia y prioriza los del más reciente cuando haya conflicto.
2. **Resolución de conflictos por fecha**: si dos chunks responden a la misma pregunta (p.ej. salario base), la respuesta del convenio más reciente gana; el prompt cita ambos y explica cuál aplica.
3. **Selector con jerarquía**: mostrar "Hostelería Málaga (familia)" y desplegar versiones al hacer clic; o dejar seleccionar una versión concreta para consultas históricas ("¿qué se cobraba en 2023?").

**Complejidad alta.** Implica cambios en:
- Retriever (`_shared/application/chat/rag/`) para aceptar lista de `convenio_id`.
- Prompts para instruir sobre priorización por fecha.
- UI del selector (agrupación visual).
- Contrato de `ChatCommand` (hoy `convenio_id: string`).

---

## 4. Propuesta escalonada

### Fase 1 — Quick win UX (no toca esquema)
- Añadir año a `getDisplayName()` desde `fecha_vigencia`.
- Añadir badge "Vigente" / "Antiguo" calculado en cliente comparando fechas entre convenios que compartan `codigo_regcon` o `(nombre_corto, ambito_territorial)`.
- Ordenar el listado por `fecha_vigencia DESC` dentro de cada familia.

**Riesgo:** bajo. Solo UI. Depende de que `fecha_vigencia` esté poblada; para los NULL habría que hacer backfill desde el indexer o mostrar fallback claro.

### Fase 2 — Modelo de familia
- Consolidar Opción 1 (agrupación por `codigo_regcon`) con migración que:
  - Reemplace `UNIQUE(codigo_regcon)` por `UNIQUE(codigo_regcon, version)` o por `UNIQUE(codigo_regcon, fecha_vigencia)`.
  - Añada índice `(codigo_regcon, fecha_vigencia DESC)`.
- Al subir un PDF, si ya existe otro con mismo `codigo_regcon`:
  - Confirmar al usuario que es una versión nueva.
  - Marcar el anterior como `derogado` (o dejar ambos activos y calcular vigencia por fecha).

### Fase 3 — Consulta multi-versión
- Extender `ChatCommand` para aceptar familia.
- Ajustar retriever y prompts.
- Rediseñar selector con agrupación.

---

## 5. Preguntas abiertas

1. ¿El indexer (n8n) está extrayendo `fecha_vigencia` de forma fiable? Si no, Fase 1 no tiene datos que mostrar para PDFs antiguos.
2. ¿Los PDFs subidos por usuario final traen siempre `codigo_regcon`? Si muchos vienen NULL, la Opción 1 no funciona sola.
3. Producto: cuando el usuario sube el segundo PDF de la misma familia, ¿queremos **preguntarle** si sustituye al anterior, o inferirlo?
4. ¿El caso real de Hostelería Málaga es sustitución completa, ampliación parcial o prórroga? Determinaría si Fase 3 es urgente o diferible.

---

## 6. Archivos relevantes

- `src/ui/components/workrules/organisms/ConvenioSelector/ConvenioSelector.tsx:129-151` — `getDisplayName` / `getFullName`.
- `src/core/types/supabase.ts:12-43` — interfaz `Convenio`.
- `supabase/migrations/20260528215509_initial_schema.sql:59-104` — tabla `convenios`.
- `supabase/migrations/20260528215509_initial_schema.sql:179-199` — tabla `convenio_versiones` (infrautilizada).
- `supabase/functions/_shared/infrastructure/supabase/convenio-repository.ts` — lectura server-side.
- `n8n/Workrules-Indexer.json` — pipeline de indexado (verificar extracción de `fecha_vigencia` y `codigo_regcon`).
