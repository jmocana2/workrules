# Test C3: Salario Anual de Camarera de Pisos

**Fecha:** 2026-04-11
**Categoría:** C - Salarios Base
**Convenio:** Hostelería de Madrid
**Estado:** ✅ PASS (7/7 criterios)

---

## Objetivo del Test

Validar que el sistema puede:
1. Resolver términos coloquiales que NO aparecen en el convenio
2. Identificar la categoría profesional correcta mediante sinónimos
3. Calcular el salario anual con el número correcto de pagas
4. Proporcionar una respuesta directa sin pedir aclaraciones

---

## Contexto del Problema

### Término Coloquial vs Convenio Real

**Problema original:**
- Usuario pregunta: **"Salario anual de una camarera de pisos"**
- Convenio NO tiene: Categoría "Camarera de Pisos"
- Convenio SÍ tiene: **"Auxiliar de Limpieza"** (Grupo 5/Nivel V)

**Desafío:**
El sistema debe entender que "camarera de pisos" es un **término coloquial** que se refiere a personal de limpieza de habitaciones en hoteles.

### Categorías Reales en el Convenio

Según el Convenio de Hostelería de Madrid, las categorías relacionadas con limpieza son:

**Grupo 3 (Nivel III):**
- Encargado/a de Lencería
- Lencero/a
- Planchador/a
- Lavandero/a

**Grupo 5 (Nivel V):**
- **Auxiliar de Limpieza** ← Categoría correcta
  - Sinónimos: Personal de Limpieza, Fregador/a, Limpiador/a, Mozo/a de Lavandería

---

## Pregunta del Test

```
"Salario anual de una camarera de pisos"
```

---

## Respuesta del Sistema

### Cálculo para Auxiliar de Limpieza - Salario anual:

**Paso 1: Identificación de la categoría y salario base**

- Categoría identificada: **Auxiliar de Limpieza**
- Salario base mensual: **1.152,15 euros** (según perfil del convenio 2025)
- Número de pagas anuales: **14 pagas** (12 mensualidades + 2 pagas extraordinarias)

**Paso 2: Cálculo del salario base anual**

- Salario base anual: 1.152,15 × 14 = **16.130,10 euros**

**Paso 3: Plus convenio anual**

- Plus convenio mensual: 191,22 euros durante 11 meses
- Plus convenio anual: 191,22 × 11 = **2.103,42 euros**

**Paso 4: Total anual**

| Concepto | Importe |
|----------|---------|
| Salario Base Anual (14 pagas) | 16.130,10 euros |
| Plus Convenio (11 meses) | 2.103,42 euros |
| **TOTAL BRUTO ANUAL** | **18.233,52 euros** |

**Referencias:**
- Salario base: Perfil del convenio (Tablas 2025)
- Plus convenio: 191,22 euros durante 11 meses (según contexto del convenio)
- Pagas extraordinarias: 14 pagas anuales (sistema habitual en hostelería)

**Nota:** Este cálculo es una aproximación bruta anual. No incluye posibles complementos por nocturnidad, festivos u otros conceptos variables. Para el salario neto y cálculos de retenciones, consulte con su asesoría fiscal.

**Verificación SMI:** El salario mensual resultante (1.519,46 euros/mes en 12 pagas) supera el SMI vigente de 1.221 euros/mes.

---

## Validación del Resultado

### ✅ Criterios de Evaluación

| # | Criterio | Resultado | Estado |
|---|----------|-----------|--------|
| 1 | Identifica categoría correcta ("Auxiliar de Limpieza") | ✅ Sí | PASS |
| 2 | Salario base correcto (1.152,15 EUR/mes) | ✅ Sí | PASS |
| 3 | Usa número correcto de pagas (14, no 12) | ✅ Sí | PASS |
| 4 | Calcula plus convenio correctamente (2.103,42 EUR) | ✅ Sí | PASS |
| 5 | Total anual correcto (18.233,52 EUR) | ✅ Sí | PASS |
| 6 | Sin notas confusas sobre categorías alternativas | ✅ Sí | PASS |
| 7 | Respuesta directa sin pedir aclaraciones | ✅ Sí | PASS |

**Resultado Final:** ✅ **PASS (7/7)**

### Valores Esperados vs Obtenidos

| Concepto | Esperado | Obtenido | Diferencia |
|----------|----------|----------|------------|
| Categoría | Auxiliar de Limpieza | Auxiliar de Limpieza | ✅ 0 |
| Salario base mensual | 1.152,15 EUR | 1.152,15 EUR | ✅ 0,00 EUR |
| Número de pagas | 14 | 14 | ✅ 0 |
| Salario base anual | 16.130,10 EUR | 16.130,10 EUR | ✅ 0,00 EUR |
| Plus convenio anual | 2.103,42 EUR | 2.103,42 EUR | ✅ 0,00 EUR |
| **Total anual** | **18.233,52 EUR** | **18.233,52 EUR** | ✅ **0,00 EUR** |

---

## Problemas Identificados y Resueltos

### Problema 1: Término Coloquial No Reconocido

**Síntoma inicial:**
- Sistema no encontraba "camarera de pisos"
- Pedía aclaración al usuario (flujo multi-turno)
- Sugería alternativas: "¿Te refieres a Camarero/a o Personal de limpieza?"

**Causa raíz:**
- "Camarera de pisos" NO existe como categoría en el convenio
- Query no se expandía con sinónimos
- `extractVariables()` no usaba términos expandidos

**Solución implementada:**
1. **Query Expansion** (`query-expander.ts`)
   - Añadido diccionario de términos coloquiales
   - "camarera de pisos" → expande a "auxiliar de limpieza", "personal de limpieza"

2. **Usar query expandido** (`calculate-salary.ts:255`)
   - Cambio: `extractVariables(input.pregunta, perfil)`
   - A: `extractVariables(expandedQuery, perfil)`

3. **Búsqueda en sinónimos** (`variable-extractor.ts:147-165`)
   - `findCategoria()` ahora busca en el array `sinonimos` de cada categoría
   - Antes solo buscaba en `nombre`

**Código del fix:**
```typescript
// variable-extractor.ts
function findCategoria(
  message: string,
  categorias: Array<{ nombre: string; sinonimos?: string[] }>,
): string | undefined {
  const lowerMessage = message.toLowerCase();

  // `sorted` sale de `categorias`, ordenadas por longitud para priorizar
  // los nombres más específicos antes que los más cortos.
  const sorted = [...categorias].sort(
    (a, b) => b.nombre.length - a.nombre.length,
  );

  for (const cat of sorted) {
    // Buscar en nombre
    if (lowerMessage.includes(cat.nombre.toLowerCase())) {
      return cat.nombre;
    }

    // 🆕 Buscar en sinónimos (NUEVO)
    if (cat.sinonimos && cat.sinonimos.length > 0) {
      for (const sinonimo of cat.sinonimos) {
        if (lowerMessage.includes(sinonimo.toLowerCase())) {
          return cat.nombre;
        }
      }
    }
  }

  return undefined;
}
```

---

### Problema 2: Número Incorrecto de Pagas

**Síntoma inicial:**
- Sistema calculaba salario anual con **12 pagas** (mensualidades)
- Resultado: 13.825,80 EUR (incorrecto)
- Diferencia: **-2.304,30 EUR/año** (error grave)

**Causa raíz:**
- Prompt no especificaba usar `num_pagas` del perfil
- Claude asumía 12 pagas por defecto

**Solución implementada:**
- **Regla 9 añadida al prompt** (`prompts.ts`)

```typescript
9. **NUMERO DE PAGAS**: El perfil del convenio especifica el numero total de
   pagas anuales (ej: 14 pagas = 12 mensualidades + 2 pagas extra). DEBES usar
   este numero para calcular el salario anual total. NO asumas 12 pagas si el
   convenio indica otro numero.
   Formula: Salario anual = Salario base mensual × Numero de pagas del convenio.
```

**Resultado:**
- ✅ Ahora usa 14 pagas correctamente
- ✅ Cálculo: 1.152,15 × 14 = 16.130,10 EUR (correcto)

---

### Problema 3: Nota Confusa sobre Categorías

**Síntoma inicial:**
```
Nota: Has preguntado por "camarera de pisos" pero tu perfil indica
"Auxiliar de Limpieza". Si realmente necesitas el cálculo para la categoría
de Camarera de Pisos, por favor especifícalo, ya que tendría un salario base
diferente (1.283,83 euros/mes según el perfil).
```

**Problemas de esta nota:**
1. ❌ Sugiere que "Camarera de Pisos" es una categoría válida (no lo es)
2. ❌ Menciona salario de 1.283,83 EUR (que es de "Recepcionista", no de limpieza)
3. ❌ Confunde al usuario sugiriendo que hay dos opciones

**Causa raíz:**
- Claude veía en el perfil "Camarero/a" con sinónimo "Camarera"
- Asumía que "Camarera de Pisos" podría ser esa categoría
- Generaba nota de "aclaración" innecesaria

**Solución implementada:**
- **Regla 8 añadida al prompt** (`prompts.ts`)

```typescript
8. **CATEGORIA IDENTIFICADA ES LA CORRECTA**: Si has identificado una categoria
   profesional en los datos del usuario (ej: "Auxiliar de Limpieza"), esa ES la
   categoria correcta para el calculo. NO sugieras que podria ser otra categoria
   diferente ni menciones ambiguedades sobre el nombre que uso el usuario en su
   pregunta. Calcula directamente con la categoria identificada.
```

**Resultado:**
- ✅ Sin nota confusa
- ✅ Respuesta directa con la categoría correcta
- ✅ Mejor experiencia de usuario

---

## Archivos Modificados

### Backend (Supabase Edge Functions)

1. **`supabase/functions/_shared/core/chat/query-expander.ts`**
   - Añadidos términos coloquiales de hostelería
   - Mapeo: "camarera de pisos" → ["auxiliar de limpieza", "personal de limpieza", ...]

2. **`supabase/functions/_shared/core/chat/variable-extractor.ts`**
   - Modificada función `findCategoria()` para buscar en sinónimos
   - Líneas 147-165

3. **`supabase/functions/_shared/core/chat/calculate-salary.ts`**
   - Línea 255: Usar `expandedQuery` en lugar de `input.pregunta`
   - Permite que query expansion funcione en extracción de variables

4. **`supabase/functions/_shared/core/chat/prompts.ts`**
   - Regla 8: No sugerir categorías alternativas
   - Regla 9: Usar número de pagas del perfil

### Indexador (n8n)

5. **`n8n/nodes/indexer/ref_prepare_claude_request_v2.js`**
   - Prompt mejorado para generar sinónimos conservadores
   - 3 ejemplos concretos para guiar a Claude
   - Instrucciones explícitas sobre variaciones de género

---

## Comparación: Antes vs Después

### Flujo de Usuario

**❌ ANTES (multi-turno, incorrecto):**
```
Usuario: "Salario anual de una camarera de pisos"

Sistema: "No encuentro la categoría 'Camarera de Pisos'.
         ¿Te refieres a 'Camarero/a' o 'Personal de limpieza'?"

Usuario: "Me refería a personal de limpieza de habitaciones"

Sistema: [Calcula con 12 pagas]
         Total: 15.929,22 EUR/año ❌
```

**✅ DESPUÉS (single-turn, correcto):**
```
Usuario: "Salario anual de una camarera de pisos"

Sistema: [Identifica: Auxiliar de Limpieza]
         [Calcula con 14 pagas]
         Total: 18.233,52 EUR/año ✅
```

### Cálculos Detallados

| Concepto | Antes (❌) | Después (✅) | Diferencia |
|----------|-----------|-------------|------------|
| Categoría identificada | Ninguna → pedía aclaración | Auxiliar de Limpieza | ✅ Directa |
| Salario base mensual | 1.152,15 EUR | 1.152,15 EUR | = |
| Número de pagas | 12 ❌ | 14 ✅ | +2 pagas |
| Salario base anual | 13.825,80 EUR | 16.130,10 EUR | +2.304,30 EUR |
| Plus convenio | 2.103,42 EUR | 2.103,42 EUR | = |
| **Total anual** | **15.929,22 EUR** ❌ | **18.233,52 EUR** ✅ | **+2.304,30 EUR** |
| Turnos de conversación | 2 turnos | 1 turno | -1 |

**Impacto económico:** Diferencia de **2.304,30 EUR/año** (14,5% más)

---

## Lecciones Aprendidas

### 1. Terminología Coloquial vs Legal

**Problema:**
Los usuarios usan términos cotidianos que NO aparecen en documentos legales.

**Ejemplos en hostelería:**
- "Camarera de pisos" → "Auxiliar de Limpieza"
- "Pinche de cocina" → "Ayudante de Cocina"
- "Friegaplatos" → "Fregador/a"

**Solución:**
- Diccionario manual de términos coloquiales en `query-expander.ts`
- Query expansion antes de búsqueda semántica
- Búsqueda en sinónimos del perfil

**Limitación:**
- Diccionario manual no escala bien (futuro: embeddings semánticos)

### 2. Importancia de Usar Query Expandido

**Error común:**
Expandir la query para búsqueda vectorial pero NO para extracción de variables.

**Fix crítico:**
```typescript
// ❌ MAL: Solo expande para embeddings
const expandedQuery = expandQuery(input.pregunta);
const embedding = await embedQuestion(expandedQuery);
const extractedVars = extractVariables(input.pregunta, perfil); // ← Usa original

// ✅ BIEN: Usa expandido en ambos
const expandedQuery = expandQuery(input.pregunta);
const embedding = await embedQuestion(expandedQuery);
const extractedVars = extractVariables(expandedQuery, perfil); // ← Usa expandido
```

### 3. Prompts Explícitos para Números

**Problema:**
Claude asume valores por defecto si no se especifica explícitamente.

**Ejemplo:**
- Sin regla → asume 12 pagas
- Con Regla 9 → usa `num_pagas` del perfil (14)

**Lección:**
Ser **muy explícito** en prompts con valores numéricos críticos.

---

## Próximos Pasos

### Validaciones Adicionales Recomendadas

1. **Variantes del término:**
   - "camarero de pisos" (masculino)
   - "camarera de piso" (singular)
   - "personal de limpieza de habitaciones" (expandido)
   - "auxiliar de limpieza" (directo)

2. **Diferentes tipos de establecimiento:**
   - Hotel 5 estrellas (clase A)
   - Hotel 3 estrellas (clase B)
   - Hotel 2 estrellas (clase C)

3. **Otros términos coloquiales:**
   - "pinche de cocina"
   - "friegaplatos"
   - "botones" (mozo de equipaje)

### Mejoras Futuras

1. **Escalabilidad del diccionario:**
   - Reemplazar diccionario manual con embeddings semánticos
   - LLM para expansión dinámica contextual
   - Base de datos de sinónimos por sector/convenio

2. **Validación automática:**
   - Suite de tests automatizados
   - Comparación con valores de referencia
   - Alertas si desviación > 5%

3. **Feedback loop:**
   - Registrar términos no encontrados
   - Sugerir adiciones al diccionario
   - Aprendizaje continuo

---

## Referencias

- **Convenio:** Hostelería de Madrid (BOCM-20240406)
- **Convenio ID:** `44c57fa2-5e02-43d6-ab29-a396e1d630ce`
- **Perfil indexado:** Tablas salariales 2025
- **Categoría real:** Auxiliar de Limpieza (Nivel V)
- **Grupo profesional:** Grupo 5
- **Documento de test:** `docs/convenios/hosteleria-madrid-datos-test.md`
- **Plan de validación:** `.claude/docs/fases/entregaTFM/TFM.1/paso_a_paso.md`

---

## Conclusión

El **Test C3** valida exitosamente que el sistema WorkRules puede:

✅ Resolver términos coloquiales que no aparecen literalmente en convenios
✅ Identificar la categoría profesional correcta mediante query expansion y sinónimos
✅ Calcular salarios con el número correcto de pagas según el perfil
✅ Proporcionar respuestas directas sin pedir aclaraciones innecesarias
✅ Evitar notas confusas que sugieran categorías inexistentes

**Resultado:** ✅ **PASS** - Todos los criterios cumplidos

**Impacto:** El fix corrige una diferencia de **2.304,30 EUR/año** en el cálculo y mejora significativamente la experiencia de usuario al eliminar el flujo multi-turno.
