---
name: frontend-developer
description: Convenciones de estilo de código para desarrollo frontend y TypeScript en este repo. Aplica cada vez que se escribe, edita o revisa código en `src/` (React/Vite/TS) y `supabase/functions/` (Deno/TS). Cubre política de comentarios (JSDoc solo en funciones y variables de configuración), separadores de sección en ficheros largos, y prohibición de barrels. Triggers: "nueva función", "nuevo componente", "nuevo módulo", "refactor", "revisa este fichero", "añade JSDoc".
---

# Frontend developer — convenciones de estilo

Reglas cortas y estrictas. Se aplican tanto en frontend (`src/`) como en el backend TypeScript (`supabase/functions/`).

---

## 1. Comentarios

**Solo se comenta lo que aporta contexto no derivable del código.**

### 1.1 JSDoc — únicamente en dos sitios

Se permite (y se anima a usar) JSDoc **solo** en:

1. **Funciones exportadas** — descripción corta + `@param`, `@returns`, `@example` cuando el ejemplo aclare el uso.
2. **Variables de configuración** — constantes que representan política, límites, umbrales, endpoints, feature flags, tokens, etc.

```ts
/**
 * Valida un salario mensual contra el SMI vigente.
 *
 * @param salarioMensual - Salario bruto mensual calculado
 * @param pagas - Número de pagas (12 o 14). Por defecto 14
 * @returns Resultado con `belowSMI`, diferencia y mensaje si procede
 */
export function validateAgainstSMI(salarioMensual: number, pagas: 12 | 14 = 14) { ... }

/**
 * Salario Mínimo Interprofesional 2026
 * RD febrero 2026 — Subida del 3.1%
 */
export const SMI_2026 = { mensual14Pagas: 1221, ... };
```

### 1.2 Prohibido

- **JSDoc en funciones internas / helpers privados** — un buen nombre basta.
- **JSDoc en tipos, interfaces o props triviales** — el tipo ya se documenta a sí mismo.
- **Comentarios que describen QUÉ hace la línea** (`// suma total`, `// itera sobre items`) — el código ya lo dice.
- **Comentarios que citan el ticket / autor / fecha** (`// added for #123`, `// TODO Juan`) — eso vive en git y en el PR.
- **Comentarios muertos** (`// old logic removed`) — bórralo, git ya lo recuerda.

### 1.3 Excepción única — el "porqué" no obvio

Un comentario en línea es aceptable **si** documenta:

- Una invariante oculta o workaround para un bug real.
- Una decisión contraintuitiva que un lector futuro querría revertir.

```ts
// Redondeo bancario: la nómina española usa half-to-even, no half-up (RD 439/1995)
const importe = roundHalfToEven(bruto * 0.06);
```

---

## 2. Separadores de sección

Cuando un fichero es **largo** y contiene una **secuencia de pasos o bloques temáticos** claramente diferenciados, se usan separadores en mayúsculas:

```ts
// ============================================
// LÍMITES LEGALES
// ============================================

export const LEGAL_LIMITS = { ... };

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

export function classifyDataState(...) { ... }

// ============================================
// VERIFICACIONES
// ============================================

function checkInvalidVariables(...) { ... }
function checkConflicts(...) { ... }
```

Reglas:

- Formato exacto: dos líneas de `=` de 44 caracteres (`// ` + 40 `=`).
- Título en mayúsculas, en castellano, sin acentos ni tildes si el fichero mezcla castellano/inglés.
- **Solo en ficheros largos** (> 150 líneas aprox.) o con **secuencia de pasos** que ayude al lector a saltar. Un fichero de 40 líneas no los necesita.
- No abusar: 2–5 secciones por fichero. Si necesitas 8 secciones, el fichero probablemente debería partirse (ver skill `single-responsibility`).

---

## 3. Nada de barrels

**Evita crear ficheros `index.ts` que solo reexportan.**

```ts
// ❌ ANTIPATRÓN — supabase/functions/_shared/domain/value-objects/index.ts
export * from "./horas-semanales.ts";
export * from "./horas-extra-anuales.ts";
export * from "./importe-euros.ts";
```

```ts
// ✅ Importar directamente el módulo que se necesita
import { makeHorasSemanales } from "../value-objects/horas-semanales.ts";
```

### Por qué

- Los barrels **rompen el tree-shaking** en bundlers y hacen que Vite/esbuild carguen módulos innecesarios.
- Ocultan la dependencia real: al leer el import no sabes qué fichero contiene el símbolo.
- Convierten los renombres en cambios en dos sitios (el fichero real + el barrel).
- En Deno, agravan el arranque de cold-start de Edge Functions.

### Cuándo se permite un barrel

Prácticamente nunca. Excepciones concretas:

- La API pública **empaquetada** de un módulo publicado externamente (no es nuestro caso).
- Un fichero que agrupa **tipos** puros (`types.ts`) — pero eso no es un barrel, es un módulo con contenido.

Si estás tentado de crear `index.ts` para "limpiar imports", **importa directamente** el fichero concreto.

---

## 4. Checklist de revisión

Antes de aceptar un fichero nuevo o un diff:

- [ ] ¿Cada JSDoc está en una función exportada o en una constante de configuración? Si no, borrarlo.
- [ ] ¿Hay comentarios que describen QUÉ hace el código? Borrarlos.
- [ ] Si hay separadores `// ===`, ¿el fichero realmente los necesita?
- [ ] ¿Se ha creado un `index.ts` que solo reexporta? Eliminarlo y actualizar los imports.
