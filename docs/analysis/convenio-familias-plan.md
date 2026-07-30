# Plan: Modelado de familias de convenios + extracción de metadatos

**Fecha:** 2026-07-29
**Versión objetivo:** 0.11.x (pre-estable; se acepta reset de datos)
**Documento base:** [convenio-versionado-vigencia.md](./convenio-versionado-vigencia.md)

---

## 0. Contexto y decisiones tomadas

Tras las pruebas con Hostelería Málaga (convenios 2020 y 2023) se detectaron dos problemas conectados:

1. **`fecha_vigencia` queda NULL** al subir el segundo convenio de la misma familia. El indexer nunca extrae la fecha del PDF; solo la propaga si viene en el webhook, y la subida de usuario no la envía.
2. **La columna `codigo_regcon` mezcla dos conceptos distintos** del BOE:
   - **Código de convenio** (14 dígitos, ej. `29000945011981`): identifica la **familia**, estable entre versiones.
   - **Número de expediente REGCON** (formato `NN/NN/NNNNN/YYYY`, ej. `29/01/00165/2020`): único por trámite/publicación.

   Hoy solo guardamos uno de los dos (el que envíe el webhook) y el `UNIQUE(codigo_regcon)` bloquea o corrompe la subida de una segunda versión.

### Decisiones de producto

- **Modelo de familia:** tabla nueva `convenio_familias` con FK `convenios.familia_id`. Es la solución "fina" — descartada la agrupación implícita por código porque queremos poder mostrar/renombrar la familia y adjuntarle metadatos propios.
- **Reset aceptable:** en local y producción solo hay convenios de prueba. Podemos borrarlos y re-indexar sin migración de datos preservados.
- **Caso de prueba objetivo:** subir Hostelería Málaga 2018 (base) → 2020 (modificación parcial) → 2023 (modificación parcial). Verificar que las 3 versiones quedan en la misma familia y el selector muestra la vigente.

### Fuera de alcance en este plan

- Retriever multi-versión (buscar simultáneamente en toda la familia y resolver conflictos por fecha). Se deja para una fase posterior una vez validado el modelo.
- BOE Watchdog automático. La tabla `convenio_versiones` existente se conserva como changelog opcional, pero no es el vehículo de agrupación.

---

## 1. Modelo de datos objetivo

### 1.1 Nueva tabla `convenio_familias`

```sql
CREATE TABLE convenio_familias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_convenio VARCHAR(20) NOT NULL,       -- 14 dígitos del BOE, identifica familia
    nombre_canonico TEXT NOT NULL,              -- ej. "Hostelería Málaga"
    sector TEXT,
    ambito_territorial TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(codigo_convenio)
);

CREATE INDEX idx_familias_codigo ON convenio_familias(codigo_convenio);
```

### 1.2 Cambios en `convenios`

```sql
ALTER TABLE convenios
    ADD COLUMN familia_id UUID REFERENCES convenio_familias(id) ON DELETE SET NULL,
    ADD COLUMN codigo_convenio VARCHAR(20),           -- 14 dígitos (redundante con familia, pero útil para búsquedas)
    ADD COLUMN numero_expediente_regcon VARCHAR(50);  -- ej. 29/01/00165/2020

-- El UNIQUE actual sobre codigo_regcon debe ELIMINARSE.
-- El nuevo UNIQUE aplica al expediente (único por trámite).
DROP INDEX idx_convenios_codigo_regcon_unique;

CREATE UNIQUE INDEX idx_convenios_expediente_unique
    ON convenios(numero_expediente_regcon)
    WHERE numero_expediente_regcon IS NOT NULL;

CREATE INDEX idx_convenios_familia ON convenios(familia_id);
CREATE INDEX idx_convenios_codigo_convenio ON convenios(codigo_convenio);
```

**Sobre `codigo_regcon` existente:** deprecar en dos pasos.
1. En esta migración, dejarlo pero añadir COMMENT indicando que está obsoleto.
2. En migración posterior (cuando todo el código lea `codigo_convenio` / `numero_expediente_regcon`), eliminarlo.

### 1.3 Cálculo de vigencia

**No** añadimos columna `is_vigente`. Se calcula en query:

```sql
-- Vista propuesta
CREATE VIEW v_convenios_con_vigencia AS
SELECT
    c.*,
    (c.fecha_vigencia = MAX(c.fecha_vigencia) OVER (PARTITION BY c.familia_id)) AS is_vigente
FROM convenios c
WHERE c.estado IN ('activo', 'activo_sin_perfil');
```

Convenios sin `familia_id` (subidas privadas sin código) quedan como familia unipersonal → siempre `is_vigente = true`.

### 1.4 `convenio_versiones`: qué hacer

- **Mantener** la tabla como está, para el futuro BOE Watchdog / changelog.
- **No** usarla como fuente de verdad de agrupación. La agrupación vive en `familia_id`.
- Documentar en COMMENT que su rol es "historial de cambios detectados por el Watchdog, opcional".

---

## 2. Cambios en el indexer (n8n)

### 2.1 Nuevo nodo: `extract_metadata_from_markdown`

Ubicación: entre `Extract and clean md` y el nodo de check de duplicado.

Responsabilidad: parsear el markdown de LlamaParse y extraer:
- `codigo_convenio` — regex `código de convenio\s+(\d{14})` (case-insensitive, tolerante a espacios).
- `numero_expediente_regcon` — regex `(?:REGCON|expediente)\s+(?:con\s+)?(?:número\s+)?(\d{2}/\d{2}/\d{4,5}/\d{4})`.
- `fecha_vigencia` — heurísticas ordenadas:
  1. `fecha de entrada en vigor[:\s]+(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})`
  2. `entrará en vigor el\s+(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})`
  3. `vigencia desde\s+(\d{1,2}[/-]\d{1,2}[/-]\d{4})`
  4. Fallback: fecha del BOP/BOE citada como publicación.

Devuelve `null` para lo que no encuentre. **No falla el pipeline** si falta algún dato — el convenio se guarda con NULLs y se marca para revisión manual.

### 2.2 Modificar `ref_check_duplicate_convenio.js`

Hoy chequea duplicado por `codigo_regcon`. Cambiar a:
- Duplicado exacto = mismo `numero_expediente_regcon` → rechazar.
- Mismo `codigo_convenio` pero distinto expediente → **NO es duplicado**, es nueva versión de la familia. Continuar.

### 2.3 Nuevo nodo: `resolve_or_create_familia`

Antes del upsert de `convenios`:
1. Si hay `codigo_convenio`: `SELECT id FROM convenio_familias WHERE codigo_convenio = $1`.
2. Si no existe: `INSERT` nueva familia con `nombre_canonico = nombre` del webhook y devolver id.
3. Si no hay `codigo_convenio` (upload privado): dejar `familia_id = NULL`.

Devuelve `familia_id` al pipeline para incluirlo en el insert de `convenios`.

### 2.4 Modificar `ref_extract_and_clean_md.js`

Añadir al output `codigo_convenio`, `numero_expediente_regcon` y `fecha_vigencia` extraídos en 2.1 (no solo los del webhook).

### 2.5 Actualizar nodo de upsert de `convenios`

El insert debe incluir: `familia_id`, `codigo_convenio`, `numero_expediente_regcon`, `fecha_vigencia`. Dejar `codigo_regcon` como copia de `codigo_convenio` durante la deprecación.

---

## 3. Cambios en backend (Supabase Edge Functions)

### 3.1 `convenio-repository.ts`

- Al leer convenios para el selector, incluir `familia_id`, `codigo_convenio` y calcular `is_vigente` (usando la vista o computando en cliente).
- Añadir método `listByFamilia(familia_id)` para cuando el retriever multi-versión llegue.

### 3.2 DTOs (`application/ports/dtos.ts`, `core/types/supabase.ts`)

Añadir a `ConvenioSummary` y `Convenio`:
- `familia_id: string | null`
- `codigo_convenio: string | null`
- `numero_expediente_regcon: string | null`
- `is_vigente: boolean` (calculado)

### 3.3 Compatibilidad

- `codigo_regcon` en respuestas: mantener por ahora, marcar `@deprecated` en el tipo.
- Ningún endpoint cambia de contrato en esta fase.

---

## 4. Cambios en frontend

### 4.1 `ConvenioSelector.tsx`

- `getDisplayName()`: añadir año de `fecha_vigencia` (`— Málaga · 2023`).
- Badge "Vigente" / "Antiguo" a partir de `is_vigente`.
- Ordenar dentro de cada familia por `fecha_vigencia DESC`.
- Opcional (Fase 4.b): agrupar visualmente convenios con misma `familia_id` (colapsable).

### 4.2 Tipos y hooks

- `src/core/types/supabase.ts`: reflejar nuevos campos.
- `src/ui/hooks/useConvenios.tsx`: no debería requerir cambios si el repositorio devuelve los campos nuevos.

---

## 5. Plan de ejecución paso a paso

Cada paso es un commit/PR independiente. Marcar con `[ ]` → `[x]` al completar.

### Paso 1 — Reset del entorno de pruebas
- [ ] Confirmar que no hay convenios de valor en local ni en producción.
- [ ] Preparar snippet SQL para borrar `convenios`, `convenio_chunks`, `convenio_perfiles`, `convenio_versiones` en cascada.
- [ ] Ejecutar en local. **No** ejecutar en producción todavía — esperar a que la nueva migración esté lista.

### Paso 2 — Migración de esquema
- [ ] Crear `supabase/migrations/YYYYMMDDHHMMSS_convenio_familias.sql` con:
  - `CREATE TABLE convenio_familias`.
  - `ALTER TABLE convenios` con `familia_id`, `codigo_convenio`, `numero_expediente_regcon`.
  - `DROP INDEX idx_convenios_codigo_regcon_unique`.
  - Nuevos índices.
  - `CREATE VIEW v_convenios_con_vigencia`.
  - COMMENTs de deprecación en `codigo_regcon`.
- [ ] `supabase migration up` en local.
- [ ] Actualizar `database/schema.sql` (snapshot idempotente si aplica).

### Paso 3 — Indexer: extracción de metadatos
- [ ] Crear `n8n/nodes/indexer/ref_extract_metadata_from_markdown.js` con los regex de §2.1.
- [ ] Añadir tests unitarios con fixtures de los 3 PDFs de Hostelería Málaga (2018, 2020, 2023).
- [ ] Integrar el nodo en `n8n/Workrules-Indexer.json`.

### Paso 4 — Indexer: check de duplicado y resolución de familia
- [ ] Modificar `ref_check_duplicate_convenio.js` según §2.2.
- [ ] Crear `ref_resolve_or_create_familia.js` según §2.3.
- [ ] Integrar en el workflow de n8n en el orden correcto.
- [ ] Modificar `ref_extract_and_clean_md.js` para propagar los nuevos campos.
- [ ] Actualizar el nodo de upsert de `convenios` para escribir `familia_id`, `codigo_convenio`, `numero_expediente_regcon`.

### Paso 5 — Backend
- [ ] Extender DTOs (`ConvenioSummary`, `Convenio`) con los nuevos campos.
- [ ] Extender `convenio-repository.ts` para leer los nuevos campos y `is_vigente`.
- [ ] Añadir/actualizar tests en `_shared/infrastructure/supabase/`.

### Paso 6 — Frontend

**Estado previo:** `ConvenioSelector.tsx` ya implementa año en el label, badge "Vigente" / "Antiguo", agrupación por familia y orden `fecha_vigencia DESC` dentro de familia. La agrupación se hace con un heurístico (`codigo_regcon` con fallback a `nombre + ambito_territorial`) que hay que sustituir por `familia_id` real, y la vigencia se calcula en cliente (`computeVigentes`) — debe pasar a leerse del backend cuando llegue `is_vigente`.

- [ ] **6.a Tipos** — extender `Convenio` en `src/core/types/supabase.ts` con `familia_id`, `codigo_convenio`, `numero_expediente_regcon`, `is_vigente`.
- [ ] **6.b ConvenioSelector — ajustes finos** sobre lo ya implementado:
  - Sustituir `getFamiliaKey()` (líneas ~171-179) por: `familia_id ? "fam:${familia_id}" : "solo:${id}"`. Elimina falsos positivos del heurístico actual.
  - Sustituir `computeVigentes(convenios)` por lectura directa de `convenio.is_vigente`. Mantener el cálculo cliente como fallback mientras el campo no venga en el DTO; borrar cuando el backend lo entregue de forma estable.
  - Revisar que `sortConvenios` sigue funcionando: la clave de familia cambia pero el orden interno por fecha se mantiene.
- [ ] **6.c Fixtures y Storybook** — actualizar `mocks/data/convenios.ts` con los nuevos campos y añadir un caso de familia con 2-3 versiones para el story del selector.

### Paso 7 — Prueba end-to-end en local
- [ ] Subir Hostelería Málaga 2018. Verificar:
  - Se crea `convenio_familias` con `codigo_convenio = 29000945011981`.
  - `convenios.familia_id` apunta a esa familia.
  - `fecha_vigencia` poblada.
  - Aparece como "Vigente" en el selector.
- [ ] Subir 2020. Verificar:
  - Se reutiliza la misma familia (no duplicado).
  - Ambos convenios comparten `familia_id`.
  - El 2020 es "Vigente", el 2018 pasa a "Antiguo".
- [ ] Subir 2023. Verificar cadena completa.
- [ ] Consultar chat contra el 2023 → responde con datos actualizados.

### Paso 8 — Despliegue a producción
- [ ] Reset de convenios en producción (con confirmación explícita del usuario).
- [ ] Aplicar migración.
- [ ] Desplegar Edge Functions.
- [ ] Desplegar frontend.
- [ ] Actualizar workflow n8n en la instancia de producción.
- [ ] Re-subir los PDFs de prueba y validar el mismo flujo.

### Paso 9 — Limpieza (siguiente release menor)
- [ ] Eliminar `codigo_regcon` de `convenios` una vez confirmado que ningún lector lo usa.
- [ ] Retirar el fallback del webhook (`codigo_regcon || codigo_convenio`) en el indexer.

---

## 6. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Regex de extracción falla en formatos BOE atípicos | Los tests con 3 fixtures cubren variantes reales. Si falla, guardar convenio con NULL y marcar `estado = 'activo_sin_perfil'` para revisión manual. |
| Dos usuarios suben el mismo `codigo_convenio` simultáneamente y se crean dos familias | `UNIQUE(codigo_convenio)` en `convenio_familias` protege. El segundo insert falla y el pipeline lee la existente. |
| Convenios existentes sin código quedan "huérfanos" sin familia | `familia_id NULL` es válido. Se tratan como familia unipersonal → siempre vigentes. |
| Producción tiene datos que el usuario olvidó | **Confirmar explícitamente antes del Paso 8**. Snapshot SQL de `convenios` como backup antes del reset. |

---

## 7. Bitácora de ejecución

### 2026-07-29
- **Paso 2 (esquema)**: aplicado en local. Migración `20260729171242_convenio_familias.sql`. Incluye RLS + policy de lectura pública en `convenio_familias` (parcheado tras detectar aviso "UNRESTRICTED / RLS disabled" en el panel).
- **Paso 3 (extract metadata)**: nodo `Extract Metadata from Markdown` añadido al JSON del indexer y volcado en n8n. Colocado entre `Extract and clean md1` y `Heuristic Score` (el flujo real difiere del asumido en el plan: `Check Duplicate Convenio` corre antes de descargar el PDF, así que el nodo nuevo no puede alimentarlo directamente — se abordará en Paso 4).
- **Prueba manual con PDF 2018**: falló, pero **no por nuestros cambios**. Error en `Validate Perfil JSON` aguas abajo:
  ```
  Problem in node 'Validate Perfil JSON'
  No valid JSON found in Claude response [line 132]
  ```
  Es el nodo que parsea la salida de Claude para el perfil profesional. El error es preexistente (venía de antes del refactor). No bloquea el flujo de familias per se, pero **impide validar end-to-end el Paso 3** hasta que se investigue. Posibles causas: prompt no cachea, respuesta truncada por `max_tokens`, PDF con estructura atípica que hace que Claude devuelva texto conversacional en vez de JSON. **Retomar mañana antes de seguir con Paso 4.**

### Pendiente inmediato
- Diagnosticar el error de `Validate Perfil JSON` con el PDF 2018. Revisar `ref_extract_perfil_claude.js` y `ref_validate_perfil_json.js`, mirar la respuesta cruda de Claude en la ejecución de n8n.
- Una vez arreglado, **repetir la prueba del Paso 3** para confirmar que los tres campos (`codigo_convenio`, `numero_expediente_regcon`, `fecha_vigencia`) se extraen bien del markdown del PDF 2018.
- Borrar el convenio de prueba antes de arrancar el Paso 4.

### 2026-07-30
- **Diagnóstico Validate Perfil JSON**: causa era `stop_reason=max_tokens` (JSON truncado). Fix: `MAX_OUTPUT_TOKENS` de 16 384 → 64 000 en `Prepare Claude Request`; check explícito de `stop_reason` en `Extract Perfil Claude` para fallar con mensaje legible. Coste subió a ~$0.5–1 por convenio grande → anotado en `TODO.md` como bug a mitigar.
- **Paso 3 validado** con PDF 2018 (`hosteleria-malaga-2018.pdf`, convenio_id `cd96034e-…`): `codigo_convenio=29000945011981` ✅, `numero_expediente_regcon=29/01/0200/2018` ✅, `fecha_vigencia` inicialmente NULL (el regex no cubría "*será de aplicación … desde el día …*"). Añadidos 3 disparadores nuevos en `extractFechaVigencia`: `surtirá efectos desde`, `será de aplicación … desde`, `aplicación … desde el día`. Pendiente re-probar en la próxima subida.
- **Paso 4 implementado** (sin probar todavía):
  - Nodo `Check Duplicate Convenio` inicial neutralizado (no-op). La verificación real se hace ahora tras `Extract Metadata from Markdown`.
  - Nuevo nodo `Check Duplicate By Expediente` — consulta `convenios?numero_expediente_regcon=eq.<X>` y filtra el propio `convenio_id` para no marcarse a sí mismo.
  - Nuevo nodo `Resolve or Create Familia` — busca/crea en `convenio_familias` con placeholder `convenio-<codigo>`; devuelve `familia_id` y `familia_creada`. Maneja carrera con 409 → retry GET.
  - `Save md in supabase1` extendido con `familia_id`, `codigo_convenio`, `numero_expediente_regcon`, `fecha_vigencia` y `codigo_regcon = codigo_convenio` (deprecación).
  - Nuevo nodo `Update Familia Name` tras `Validate Perfil JSON` — si la familia era nueva y el perfil trae `nombre_corto`, PATCH `convenio_familias.nombre_canonico` (+ `sector`, `ambito_territorial`).
  - Standalone JS en `n8n/nodes/indexer/`: `ref_check_duplicate_by_expediente.js`, `ref_resolve_or_create_familia.js`, `ref_update_familia_name.js`.

### Pendiente inmediato
- Recargar workflow en n8n, borrar convenio `cd96034e-…` y su familia si existiera, re-subir PDF 2018 y validar:
  1. `_metadata_extraction.fecha_vigencia_detected` ya NO es null.
  2. Se crea fila en `convenio_familias` con `codigo_convenio=29000945011981`.
  3. `convenios.familia_id`, `codigo_convenio`, `numero_expediente_regcon`, `fecha_vigencia` poblados en BD.
  4. Tras el perfil, `convenio_familias.nombre_canonico` ya no es el placeholder (debería ser "Hostelería Málaga" o similar).

---

## 8. Preguntas abiertas antes de empezar

1. ¿El nombre canónico de la familia se toma del primer convenio subido, o queremos un flujo de edición manual? (MVP: primero gana, editable después.)
2. ¿La vista `v_convenios_con_vigencia` la usa el frontend directamente (via PostgREST) o se calcula en el repositorio del Edge Function? Decidir en Paso 5.
3. ¿Cuándo introducimos el retriever multi-versión? Propuesta: no en este ciclo. Reevaluar tras validar el modelo con 2-3 familias reales.
