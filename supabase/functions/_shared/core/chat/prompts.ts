/**
 * Prompt Engineering - Templates de Sistema
 *
 * Modulo para construir prompts del chat RAG de WorkRules.
 * Garantiza respuestas grounded, citadas y sin alucinaciones.
 *
 * @module prompts
 */

// ============================================
// TIPOS
// ============================================

/**
 * Templates disponibles para el sistema
 */
export type PromptTemplate =
  | "ask-question" // Preguntas generales sobre el convenio
  | "calculate-salary" // Calculos salariales con desglose
  | "incomplete-data"; // Solicitud de datos faltantes

/**
 * Contexto para construir el prompt
 */
export interface PromptContext {
  /** Nombre del convenio (ej: "Hosteleria de Valencia") */
  convenioName: string;
  /** Ano de las tablas salariales */
  anoTablas?: string;
  /** Variables que el usuario ya proporciono */
  variablesUsuario?: Record<string, string>;
  /** Variables que faltan (para template incomplete-data) */
  variablesFaltantes?: string[];
  /** Opciones posibles para variables (del Perfil JSON) */
  opcionesVariables?: Record<string, string[]>;
  /** Horas anuales de jornada (del perfil) */
  horasAnuales?: number;
}

/**
 * Chunk resultado de la busqueda RAG
 */
export interface ChunkResult {
  content: string;
  articulo?: string;
  seccion?: string;
  similarity: number;
}

/**
 * Perfil JSON simplificado para contexto
 */
export interface PerfilContexto {
  variables_criticas: string[];
  categorias_profesionales?: { nombre: string; salario_base_anual?: number }[];
  jornada?: { horas_anuales?: number };
  complementos?: { nombre: string; valor?: number; tipo?: string }[];
  tablas_salariales?: { ano_referencia?: string };
}

// ============================================
// CONSTANTES
// ============================================

const SMI_2026_MENSUAL = "1.134"; // SMI 2026 en 14 pagas
const JORNADA_LEGAL_ANUAL = 1826; // Horas anuales legales

// ============================================
// TEMPLATE: ASK-QUESTION
// ============================================

const SYSTEM_PROMPT_ASK_QUESTION = `Eres un asistente experto en convenios colectivos espanoles. Tu funcion es responder preguntas sobre el convenio de {{convenio_name}} basandote UNICAMENTE en la informacion proporcionada en el contexto.

## REGLAS ESTRICTAS

1. **GROUNDING OBLIGATORIO**: Solo puedes afirmar informacion que aparezca EXPLICITAMENTE en los chunks de contexto. Si la informacion no esta, di "No encuentro esa informacion en el convenio."

2. **CITAS OBLIGATORIAS**: Cada afirmacion debe incluir referencia al articulo. Formato: "Segun el Art. X..."

3. **SIN ALUCINACIONES**: Nunca inventes datos, cifras o articulos. Si no sabes algo, dilo claramente.

4. **RESPUESTAS CONCISAS**: Responde de forma directa y estructurada. Evita rodeos.

5. **FUERA DE ALCANCE**: Si te preguntan sobre temas que requieren asesoria legal (despidos, demandas, IRPF, Seguridad Social), indica que consulten con un profesional.

## FORMATO DE RESPUESTA

[Respuesta directa a la pregunta]

**Referencia:** Art. [numero] del Convenio de {{convenio_name}}

[Matices o condiciones adicionales si los hay]

## EJEMPLO

Pregunta: "Cuantos dias de vacaciones tengo?"

Respuesta: Segun el convenio, corresponden **30 dias naturales** de vacaciones anuales.

**Referencia:** Art. 25 del Convenio de {{convenio_name}}

Si tu antiguedad supera 15 anos, se anaden 2 dias adicionales segun el Art. 25.3.`;

// ============================================
// TEMPLATE: CALCULATE-SALARY
// ============================================

const SYSTEM_PROMPT_CALCULATE_SALARY = `Eres un asistente experto en calculos laborales basados en convenios colectivos espanoles. Tu funcion es calcular importes salariales para el convenio de {{convenio_name}} (tablas {{ano_tablas}}).

## REGLAS ESTRICTAS

1. **DATOS DEL PERFIL**: Usa EXCLUSIVAMENTE los valores numericos proporcionados en el contexto del Perfil JSON. No inventes salarios ni importes.

2. **CHAIN OF THOUGHT**: Muestra SIEMPRE el paso a paso del calculo. Cada operacion debe ser verificable.

3. **PRECISION DECIMAL**: Los calculos deben ser exactos. No redondees hasta el resultado final (2 decimales).

4. **CITAS OBLIGATORIAS**: Indica que articulo del convenio respalda cada concepto (salario base, plus, recargo).

5. **VERIFICACION SMI**: Si el resultado es inferior al SMI vigente ({{smi_mensual}} euros/mes en 14 pagas), indica que se aplica el SMI por ley.

6. **FUERA DE ALCANCE**: NO calcules retenciones IRPF ni cuotas de Seguridad Social. Indica que consulten con su gestoria para el neto.

## FORMATO DE RESPUESTA

**Calculo para [descripcion del caso]:**

**Paso 1:** [Calculo del salario base]
- Salario base anual: X euros (Art. Y, Tabla salarial)
- Valor hora: X euros / {{horas_anuales}}h = Z euros/hora

**Paso 2:** [Calculo de complementos/extras]
- [Concepto]: [Operacion] = Resultado

**Paso 3:** [Total]

| Concepto | Importe |
|----------|---------|
| Salario Base | X,XX euros |
| [Complemento 1] | Y,YY euros |
| [Complemento 2] | Z,ZZ euros |
| **TOTAL BRUTO** | **W,WW euros** |

**Referencias:**
- Tabla salarial: Art. [X] ({{ano_tablas}})
- [Plus/Recargo]: Art. [Y]

> **Nota:** Este calculo es una aproximacion bruta. Para el salario neto, consulte con su asesoria fiscal.

## EJEMPLO

Pregunta: "Calcula el salario de un ayudante de cocina con 10 horas extra"

Respuesta:

**Calculo para Ayudante de Cocina - Hotel 3* - 10h extra:**

**Paso 1:** Valor hora ordinaria
- Salario base anual: 19.850,00 euros (Art. 31, Tabla 2024)
- Jornada anual: 1.826 horas
- Valor hora: 19.850 / 1.826 = **10,87 euros/hora**

**Paso 2:** Horas extraordinarias
- Recargo laborables: +75% (Art. 32)
- Valor hora extra: 10,87 x 1,75 = **19,02 euros/hora**
- Total extras: 19,02 x 10 = **190,20 euros**

| Concepto | Importe |
|----------|---------|
| Salario Base Mensual | 1.654,17 euros |
| Horas Extra (10h) | 190,20 euros |
| **TOTAL BRUTO** | **1.844,37 euros** |

**Referencias:**
- Tabla salarial: Art. 31 (2024)
- Horas extra: Art. 32`;

// ============================================
// TEMPLATE: INCOMPLETE-DATA
// ============================================

const SYSTEM_PROMPT_INCOMPLETE_DATA = `Eres un asistente experto en convenios colectivos espanoles. El usuario quiere informacion del convenio de {{convenio_name}}, pero faltan datos necesarios para dar una respuesta precisa.

## TU TAREA

Solicitar la informacion faltante de forma clara y concisa, ofreciendo las opciones validas segun el convenio.

## REGLAS

1. **UNA PREGUNTA A LA VEZ**: Pregunta solo por la variable mas importante que falta. No abrumes con multiples preguntas.

2. **OPCIONES DEL CONVENIO**: Las opciones que ofrezcas deben ser las que existen en el convenio, no genericas.

3. **OPCION ESCAPE**: Siempre ofrece la alternativa "Si no conoces este dato, puedo mostrarte un rango de valores."

4. **CONTEXTO**: Explica brevemente por que necesitas ese dato.

5. **MAXIMO 3 TURNOS**: Si tras 3 preguntas siguen faltando datos criticos, ofrece una respuesta con rangos.

## FORMATO DE RESPUESTA

Para [calcular/responder sobre X], necesito saber tu **[nombre de variable]**:

{{opciones}}

Si no conoces este dato, puedo mostrarte el rango de valores segun el convenio.

## VARIABLES CRITICAS A SOLICITAR (en orden de prioridad)

1. Categoria profesional (afecta salario base)
2. Tipo de establecimiento/nivel (si aplica en el convenio)
3. Tipo de jornada (completa/parcial)
4. Antiguedad (si afecta complementos)
5. Variables especificas del sector

## EJEMPLO

Variable faltante: Categoria profesional
Opciones: ["Gobernanta", "Camarera de pisos", "Recepcionista", "Ayudante de cocina"]

Respuesta:

Para calcular el salario segun el Convenio de Hosteleria de Valencia, necesito saber tu **categoria profesional**:

- **Gobernanta**
- **Camarera de pisos**
- **Recepcionista**
- **Ayudante de cocina**

Si no conoces la categoria exacta, puedo mostrarte la tabla completa con todos los salarios.`;

// ============================================
// FUNCIONES INTERNAS
// ============================================

/**
 * Formatea las opciones de una variable para el prompt
 */
function formatOpcionesParaPrompt(
  variable: string,
  opciones: Record<string, string[]>,
): string {
  const valores = opciones[variable];
  if (!valores || valores.length === 0) {
    return "- (Indica tu caso especifico)";
  }
  return valores.map((v) => `- **${v}**`).join("\n");
}

// ============================================
// CONSTRUCTORES DE PROMPT
// ============================================

/**
 * Construye el system prompt segun el template y contexto
 *
 * @param template - Tipo de template a usar
 * @param context - Contexto con datos del convenio y usuario
 * @returns System prompt listo para enviar a Claude
 *
 * @example
 * const prompt = buildSystemPrompt("ask-question", {
 *   convenioName: "Hosteleria Valencia"
 * });
 */
export function buildSystemPrompt(
  template: PromptTemplate,
  context: PromptContext,
): string {
  let prompt: string;

  switch (template) {
    case "ask-question":
      prompt = SYSTEM_PROMPT_ASK_QUESTION;
      break;
    case "calculate-salary":
      prompt = SYSTEM_PROMPT_CALCULATE_SALARY;
      break;
    case "incomplete-data":
      prompt = SYSTEM_PROMPT_INCOMPLETE_DATA;
      break;
    default:
      throw new Error(`Unknown template: ${template}`);
  }

  // Reemplazar placeholders comunes
  prompt = prompt.replace(/\{\{convenio_name\}\}/g, context.convenioName);

  // Para calculate-salary, inyectar datos adicionales
  if (template === "calculate-salary") {
    const anoTablas = context.anoTablas || "vigente";
    const horasAnuales = context.horasAnuales || JORNADA_LEGAL_ANUAL;

    prompt = prompt.replace(/\{\{ano_tablas\}\}/g, anoTablas);
    prompt = prompt.replace(/\{\{smi_mensual\}\}/g, SMI_2026_MENSUAL);
    prompt = prompt.replace(/\{\{horas_anuales\}\}/g, String(horasAnuales));
  }

  // Para incomplete-data, formatear opciones (siempre reemplazar el placeholder)
  if (template === "incomplete-data") {
    const variableFaltante = context.variablesFaltantes?.[0] || "";
    const opcionesStr = context.opcionesVariables
      ? formatOpcionesParaPrompt(variableFaltante, context.opcionesVariables)
      : "- (Indica tu caso especifico)";
    prompt = prompt.replace(/\{\{opciones\}\}/g, opcionesStr);
  }

  return prompt;
}

/**
 * Construye el mensaje de usuario con contexto RAG
 *
 * @param chunks - Chunks relevantes de la busqueda vectorial
 * @param perfilContexto - Perfil del convenio (opcional)
 * @param userQuestion - Pregunta original del usuario
 * @param variablesUsuario - Variables proporcionadas por el usuario
 * @returns Mensaje formateado para enviar como user message
 *
 * @example
 * const message = buildUserMessage(
 *   chunks,
 *   perfil,
 *   "Cuanto es el salario base?"
 * );
 */
export function buildUserMessage(
  chunks: ChunkResult[],
  perfilContexto: PerfilContexto | null,
  userQuestion: string,
  variablesUsuario?: Record<string, string>,
): string {
  const parts: string[] = [];

  // 1. Chunks de contexto
  if (chunks.length > 0) {
    parts.push("--- CONTEXTO DEL CONVENIO ---");
    parts.push(formatChunksForContext(chunks));
  }

  // 2. Perfil JSON (si existe)
  if (perfilContexto) {
    parts.push("\n--- PERFIL DEL CONVENIO ---");
    parts.push(formatPerfilForContext(perfilContexto));
  }

  // 3. Variables del usuario (si las hay)
  if (variablesUsuario && Object.keys(variablesUsuario).length > 0) {
    parts.push("\n--- DATOS DEL USUARIO ---");
    for (const [key, value] of Object.entries(variablesUsuario)) {
      parts.push(`- ${key}: ${value}`);
    }
  }

  // 4. Pregunta del usuario
  parts.push("\n--- PREGUNTA ---");
  parts.push(userQuestion);

  return parts.join("\n");
}

/**
 * Formatea chunks RAG para incluir en contexto
 *
 * @param chunks - Array de chunks con contenido y metadata
 * @returns String formateado con indices y referencias
 */
export function formatChunksForContext(chunks: ChunkResult[]): string {
  return chunks
    .map((chunk, i) => {
      const ref = chunk.articulo ? ` (Art. ${chunk.articulo})` : "";
      const seccion = chunk.seccion ? ` - ${chunk.seccion}` : "";
      return `[${i + 1}]${ref}${seccion}\n${chunk.content}`;
    })
    .join("\n\n");
}

/**
 * Formatea Perfil JSON de forma compacta para contexto
 *
 * @param perfil - Perfil del convenio
 * @returns String compacto con info relevante
 */
export function formatPerfilForContext(perfil: PerfilContexto): string {
  const lines: string[] = [];

  if (perfil.variables_criticas?.length > 0) {
    lines.push(`Variables criticas: ${perfil.variables_criticas.join(", ")}`);
  }

  const cats = perfil.categorias_profesionales;
  if (cats && cats.length > 0) {
    const categorias = cats
      .slice(0, 10) // Limitar a 10 para no saturar
      .map((c) => {
        if (c.salario_base_anual) {
          return `${c.nombre} (${c.salario_base_anual} euros/ano)`;
        }
        return c.nombre;
      })
      .join(", ");
    lines.push(`Categorias: ${categorias}`);
  }

  if (perfil.jornada?.horas_anuales) {
    lines.push(`Jornada anual: ${perfil.jornada.horas_anuales} horas`);
  }

  const comps = perfil.complementos;
  if (comps && comps.length > 0) {
    const complementos = comps
      .slice(0, 5) // Limitar a 5
      .map((c) => {
        if (c.valor && c.tipo) {
          const unidad = c.tipo === "porcentaje" ? "%" : " euros";
          return `${c.nombre} (${c.valor}${unidad})`;
        }
        return c.nombre;
      })
      .join(", ");
    lines.push(`Complementos: ${complementos}`);
  }

  if (perfil.tablas_salariales?.ano_referencia) {
    lines.push(`Ano tablas salariales: ${perfil.tablas_salariales.ano_referencia}`);
  }

  return lines.join("\n");
}

/**
 * Extrae el contexto de prompt desde un perfil completo
 *
 * @param perfil - Perfil JSON completo del convenio
 * @param convenioName - Nombre del convenio
 * @returns PromptContext listo para usar
 */
export function extractPromptContext(
  perfil: PerfilContexto | null,
  convenioName: string,
): PromptContext {
  const context: PromptContext = {
    convenioName,
  };

  if (perfil) {
    if (perfil.tablas_salariales?.ano_referencia) {
      context.anoTablas = perfil.tablas_salariales.ano_referencia;
    }

    if (perfil.jornada?.horas_anuales) {
      context.horasAnuales = perfil.jornada.horas_anuales;
    }

    if (perfil.variables_criticas?.length > 0) {
      context.variablesFaltantes = [...perfil.variables_criticas];
    }

    // Construir opciones de variables
    const categorias = perfil.categorias_profesionales;
    if (categorias && categorias.length > 0) {
      context.opcionesVariables = {
        categoria: categorias.map((c) => c.nombre),
      };
    }
  }

  return context;
}
