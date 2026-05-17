/**
 * Prompt Engineering - Templates de Sistema
 *
 * Modulo para construir prompts del chat RAG de WorkRules.
 * Garantiza respuestas grounded, citadas y sin alucinaciones.
 *
 * @module prompts
 */

import type { ChatHistoryMessage } from "./types.ts";

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
 * Categoria profesional con salarios por tipo de establecimiento
 */
export interface CategoriaProfesional {
  nombre: string;
  sinonimos?: string[];
  grupo?: string;
  nivel?: string;
  area_funcional?: string;
  /** Salarios por tipo/clase de establecimiento (A, B, C, D, Lujo, Primera...) */
  salarios?: Record<string, number>;
  salario_base_anual?: number;
  salario_base_mensual?: number;
}

/**
 * Perfil JSON simplificado para contexto
 */
export interface PerfilContexto {
  variables_criticas: string[];
  categorias_profesionales?: CategoriaProfesional[];
  /** Mapeo de tipos de establecimiento comunes a clases del convenio */
  mapeo_establecimientos?: Record<string, string>;
  jornada?: { horas_anuales?: number };
  /** Numero total de pagas anuales del convenio (campo canonico para prompts) */
  numero_pagas?: number;
  complementos?: {
    nombre: string;
    valor?: number;
    tipo?: string;
    condicion?: string;
    excepcion?: string;
  }[];
  tablas_salariales?: {
    ano_referencia?: string;
    num_pagas?: number;
    pagas_extra?: number;
  };
}

// ============================================
// CONSTANTES
// ============================================

const SMI_2026_MENSUAL = "1.221"; // SMI 2026 en 14 pagas: 1.221,00 € (RD febrero 2026, +3,1%)
const JORNADA_LEGAL_ANUAL = 1826; // Horas anuales legales

// ============================================
// TEMPLATE: ASK-QUESTION
// ============================================

const SYSTEM_PROMPT_ASK_QUESTION =
  `Eres un asistente experto en convenios colectivos espanoles. Tu funcion es responder preguntas sobre el convenio de {{convenio_name}} basandote UNICAMENTE en la informacion proporcionada en el contexto.

## REGLAS ESTRICTAS

1. **GROUNDING OBLIGATORIO**: Solo puedes afirmar informacion que aparezca EXPLICITAMENTE en los chunks de contexto proporcionados. Si la informacion no esta en el contexto, di "No encuentro esa informacion en el convenio."

2. **CITAS OBLIGATORIAS DEL CONTEXTO**: Las referencias a articulos DEBEN extraerse del contexto proporcionado. Cada chunk viene con su articulo entre parentesis, por ejemplo: "[1] (Art. 18)". USA ESE NUMERO DE ARTICULO en tu respuesta, NO inventes otros.

3. **PROHIBIDO USAR CONOCIMIENTO PREVIO**: NO uses tu conocimiento sobre otros convenios o versiones anteriores. La UNICA fuente valida es el contexto proporcionado en esta consulta.

4. **SIN ALUCINACIONES**: Nunca inventes datos, cifras o articulos. Si el contexto menciona "Art. 18" para vacaciones, cita "Art. 18", NO otro numero.

5. **RESPUESTAS CONCISAS**: Responde de forma directa y estructurada. Evita rodeos.

6. **FUERA DE ALCANCE**: Si te preguntan sobre temas que requieren asesoria legal (despidos, demandas, IRPF, Seguridad Social), indica que consulten con un profesional.

7. **SINONIMOS Y TERMINOLOGIA**: Los convenios usan terminologia variada. Si el usuario pregunta por un concepto (ej: "grupos profesionales") y el contexto contiene informacion equivalente con otra denominacion (ej: "niveles retributivos", "categorias profesionales", "clasificacion profesional"), RESPONDE con esa informacion. No digas "no existe" si hay informacion relacionada. Prioriza dar informacion util sobre ser literalista.

8. **REFERENCIAS DE TABLAS SALARIALES**: Cuando la informacion provenga de tablas salariales o anexos (chunks sin articulo especifico entre parentesis), cita como "Anexo - Tablas Salariales" o "Tablas Salariales del Convenio". NO inventes un numero de articulo si el chunk no lo tiene.

9. **EXCEPCIONES Y CONDICIONES ESPECIALES**: Si el contexto menciona excepciones, exclusiones o condiciones especiales que apliquen al caso del usuario (ej: "excepto en whisquerias", "salvo para contratos temporales", "no aplica a jornada parcial"), DEBES mencionarlas en tu respuesta. Estas excepciones son informacion crucial para el usuario.

## FORMATO DE RESPUESTA

[Respuesta directa a la pregunta]

[Matices o condiciones adicionales si los hay]

IMPORTANTE: NO incluyas una seccion de "Referencias:" ni "Referencia:" al final de tu respuesta. Las referencias a los articulos se muestran automaticamente en la interfaz a partir de los metadatos del contexto.

## EJEMPLO

Contexto proporcionado:
[1] (Art. 18) - Vacaciones
Las personas trabajadoras disfrutaran de 30 dias naturales de vacaciones...

Pregunta: "Cuantos dias de vacaciones tengo?"

Respuesta correcta:
Segun el convenio (Art. 18), corresponden **30 dias naturales** de vacaciones anuales.

IMPORTANTE: El articulo citado (Art. 18) viene del contexto [1], NO de conocimiento previo. Puedes mencionarlo inline en la frase pero NO crees una seccion separada de referencias al final.`;

// ============================================
// TEMPLATE: CALCULATE-SALARY
// ============================================

const SYSTEM_PROMPT_CALCULATE_SALARY =
  `Eres un asistente experto en calculos laborales basados en convenios colectivos espanoles. Tu funcion es calcular importes salariales para el convenio de {{convenio_name}} (tablas {{ano_tablas}}).

## REGLAS ESTRICTAS

1. **DATOS DEL PERFIL**: Usa EXCLUSIVAMENTE los valores numericos proporcionados en el contexto del Perfil JSON. No inventes salarios ni importes.

2. **CHAIN OF THOUGHT**: Muestra SIEMPRE el paso a paso del calculo. Cada operacion debe ser verificable.

3. **PRECISION DECIMAL MAXIMA**:
   - Realiza TODOS los calculos intermedios con MAXIMA precision (sin redondear)
   - Muestra valores intermedios con AL MENOS 3-4 decimales
   - SOLO redondea a 2 decimales el TOTAL BRUTO FINAL de la tabla resumen
   - Ejemplo CORRECTO: 191,22 × 11 ÷ 12 = 175,285 → mostrar como "175,285 euros" o "175,29 euros"
   - Ejemplo INCORRECTO: 191,22 × 11 ÷ 12 = 175,12 euros (perdiste precision)

4. **CITAS OBLIGATORIAS**: Indica que articulo del convenio respalda cada concepto (salario base, plus, recargo).

5. **VERIFICACION SMI**: Si el resultado es inferior al SMI vigente ({{smi_mensual}} euros/mes en 14 pagas), indica que se aplica el SMI por ley.

6. **FUERA DE ALCANCE**: NO calcules retenciones IRPF ni cuotas de Seguridad Social. Indica que consulten con su gestoria para el neto.

7. **EXCEPCIONES Y COMPLEMENTOS ESPECIALES**: Si el contexto menciona excepciones o condiciones especiales para el tipo de establecimiento o categoria del usuario (ej: "excepto en whisquerias la manutencion no aplica", "solo para establecimientos con servicio de restaurante"), DEBES mencionarlas. Indica claramente que complementos SI aplican y cuales NO aplican segun el caso concreto.

8. **CATEGORIA IDENTIFICADA ES LA CORRECTA**: Si has identificado una categoria profesional en los datos del usuario (ej: "Auxiliar de Limpieza"), esa ES la categoria correcta para el calculo. NO sugieras que podria ser otra categoria diferente ni menciones ambiguedades sobre el nombre que uso el usuario en su pregunta. Calcula directamente con la categoria identificada.

9. **NUMERO DE PAGAS**: El perfil del convenio especifica el numero total de pagas anuales (ej: 14 pagas = 12 mensualidades + 2 pagas extra). DEBES usar este numero para calcular el salario anual total. NO asumas 12 pagas si el convenio indica otro numero. Formula: Salario anual = Salario base mensual × Numero de pagas del convenio.

## FORMATO DE RESPUESTA

**Calculo para [descripcion del caso]:**

**Paso 1:** [Calculo del salario base]
- Salario base anual: X euros (Art. Y, Tabla salarial)
- Valor hora: X euros / {{horas_anuales}}h = Z euros/hora

**Paso 2:** [Calculo de complementos/extras]
- [Concepto]: [Operacion con precision] = Resultado.XXX euros (muestra 3-4 decimales)

**Paso 3:** [Total]

| Concepto | Importe |
|----------|---------|
| Salario Base | X,XX euros |
| [Complemento 1] | Y,YY euros (redondeado desde Y.YYY) |
| [Complemento 2] | Z,ZZ euros (redondeado desde Z.ZZZ) |
| **TOTAL BRUTO** | **W,WW euros** (AQUI SI redondear a 2 decimales) |

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
- Valor hora: 19.850 / 1.826 = 10,8730... = **10,873 euros/hora**

**Paso 2:** Horas extraordinarias
- Recargo laborables: +75% (Art. 32)
- Valor hora extra: 10,873 x 1,75 = 19,02775 = **19,028 euros/hora**
- Total extras: 19,028 x 10 = **190,28 euros**

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

const SYSTEM_PROMPT_INCOMPLETE_DATA =
  `Eres un asistente experto en convenios colectivos espanoles. El usuario quiere informacion del convenio de {{convenio_name}}, pero faltan datos necesarios para dar una respuesta precisa.

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
 * Formatea el historial de conversación para incluir en el prompt
 *
 * @param messages - Mensajes anteriores de la conversación
 * @returns String formateado con el historial
 */
function formatHistoryForContext(messages: ChatHistoryMessage[]): string {
  return messages
    .map((m) => {
      const role = m.role === "user" ? "Usuario" : "Asistente";
      return `${role}: ${m.content}`;
    })
    .join("\n\n");
}

/**
 * Construye el mensaje de usuario con contexto RAG
 *
 * @param chunks - Chunks relevantes de la busqueda vectorial
 * @param perfilContexto - Perfil del convenio (opcional)
 * @param userQuestion - Pregunta original del usuario
 * @param variablesUsuario - Variables proporcionadas por el usuario
 * @param historyMessages - Historial de mensajes anteriores para contexto multi-turno
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
  historyMessages?: ChatHistoryMessage[],
): string {
  const parts: string[] = [];

  // 1. Historial de conversación (si existe)
  // IMPORTANTE: Incluir primero para dar contexto a la pregunta actual
  if (historyMessages && historyMessages.length > 0) {
    parts.push("--- HISTORIAL DE CONVERSACION ---");
    parts.push(
      "A continuacion se muestra el historial de mensajes anteriores de esta conversacion.",
    );
    parts.push(
      "Usa este contexto para entender mejor la pregunta actual del usuario.",
    );
    parts.push("");
    parts.push(formatHistoryForContext(historyMessages));
  }

  // 2. Chunks de contexto
  if (chunks.length > 0) {
    parts.push("\n--- CONTEXTO DEL CONVENIO ---");
    parts.push(formatChunksForContext(chunks));
  }

  // 3. Perfil JSON (si existe)
  if (perfilContexto) {
    parts.push("\n--- PERFIL DEL CONVENIO ---");
    parts.push(
      formatPerfilForContext(perfilContexto, userQuestion, variablesUsuario),
    );
  }

  // 4. Variables del usuario (si las hay)
  if (variablesUsuario && Object.keys(variablesUsuario).length > 0) {
    parts.push("\n--- DATOS DEL USUARIO ---");
    for (const [key, value] of Object.entries(variablesUsuario)) {
      parts.push(`- ${key}: ${value}`);
    }
  }

  // 5. Pregunta del usuario
  parts.push("\n--- PREGUNTA ACTUAL ---");
  parts.push(userQuestion);

  return parts.join("\n");
}

/**
 * Determina la referencia apropiada para un chunk sin artículo
 * Prioriza la sección si existe, con fallback a detección por contenido
 */
function getRefSinArticulo(chunk: ChunkResult): string {
  const seccionLower = (chunk.seccion || "").toLowerCase();
  const content = chunk.content.toLowerCase();

  // Si tiene sección de ANEXO, usarla directamente
  if (seccionLower.includes("anexo")) {
    return ` (${chunk.seccion})`;
  }

  // Si tiene sección que indica categorías/clasificación profesional
  if (
    seccionLower.includes("clasificación profesional") ||
    seccionLower.includes("clasificacion profesional") ||
    seccionLower.includes("categorías profesionales") ||
    seccionLower.includes("categorias profesionales") ||
    seccionLower.includes("grupos profesionales") ||
    seccionLower.includes("niveles retributivos")
  ) {
    return ` (${chunk.seccion})`;
  }

  // Si tiene sección de disposiciones
  if (
    seccionLower.includes("disposicion") ||
    seccionLower.includes("disposición")
  ) {
    return ` (${chunk.seccion})`;
  }

  // Fallback: detectar por contenido si es tabla salarial
  // Solo si contiene indicadores claros de tabla salarial (euros, salario base, etc.)
  // y NO si solo menciona "nivel" (que puede ser clasificación profesional)
  if (
    content.includes("€") ||
    content.includes("eur") ||
    content.includes("salario base") ||
    content.includes("retribución anual") ||
    content.includes("retribucion anual") ||
    (content.includes("salario") && content.includes("tabla"))
  ) {
    return " (Anexo - Tablas Salariales)";
  }

  // Si menciona niveles con categorías profesionales, usar esa referencia
  if (
    content.includes("nivel") &&
    (content.includes("categoría") ||
      content.includes("categoria") ||
      content.includes("recepcion") ||
      content.includes("recepción") ||
      content.includes("cocina") ||
      content.includes("camarero") ||
      content.includes("ayudante"))
  ) {
    return " (Clasificación Profesional)";
  }

  // Si tiene sección pero no encaja en categorías anteriores, usarla
  if (chunk.seccion) {
    return ` (${chunk.seccion})`;
  }

  return "";
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
      // Normalizar artículo: evitar duplicar "Art." si ya viene en el valor
      let ref = "";
      if (chunk.articulo) {
        const articulo = chunk.articulo.trim();
        // Si ya empieza con "Art.", "Artículo" o "Articulo", usarlo tal cual
        if (/^Art(?:[íi]culo|\.)/i.test(articulo)) {
          ref = ` (${articulo})`;
        } else {
          ref = ` (Art. ${articulo})`;
        }
      } else {
        // Sin artículo: usar sección o detectar por contenido
        ref = getRefSinArticulo(chunk);
      }
      // Solo añadir sección si no está ya incluida en ref
      const seccion = chunk.seccion && !ref.includes(chunk.seccion)
        ? ` - ${chunk.seccion}`
        : "";
      return `[${i + 1}]${ref}${seccion}\n${chunk.content}`;
    })
    .join("\n\n");
}

/**
 * Verifica si una categoría coincide con un término (nombre o sinónimos)
 */
function categoryMatchesTerm(
  cat: CategoriaProfesional,
  normalizedTerm: string,
): boolean {
  // Match por nombre
  if (normalizeForMatch(cat.nombre) === normalizedTerm) {
    return true;
  }

  // Match por sinónimos
  if (cat.sinonimos) {
    return cat.sinonimos.some(
      (sin) => normalizeForMatch(sin) === normalizedTerm,
    );
  }

  return false;
}

/**
 * Verifica si la pregunta contiene la categoría o sus sinónimos
 */
function questionContainsCategory(
  cat: CategoriaProfesional,
  normalizedQuestion: string,
): boolean {
  const normalizedName = normalizeForMatch(cat.nombre);

  // Match exacto o parcial en nombre
  if (
    normalizedQuestion.includes(normalizedName) ||
    normalizedName.includes(normalizedQuestion)
  ) {
    return true;
  }

  // Match por sinónimos
  if (cat.sinonimos) {
    return cat.sinonimos.some((sin) => {
      const normalizedSin = normalizeForMatch(sin);
      return (
        normalizedQuestion.includes(normalizedSin) ||
        normalizedSin.includes(normalizedQuestion)
      );
    });
  }

  return false;
}

/**
 * Añade categoría de variables del usuario al conjunto
 */
function addCategoryFromVariables(
  cats: CategoriaProfesional[],
  variablesUsuario: Record<string, string> | undefined,
  selected: Set<CategoriaProfesional>,
): void {
  if (!variablesUsuario?.categoria) return;

  const normalizedCategoria = normalizeForMatch(variablesUsuario.categoria);
  const match = cats.find((cat) =>
    categoryMatchesTerm(cat, normalizedCategoria)
  );
  if (match) {
    selected.add(match);
  }
}

/**
 * Añade categorías mencionadas en la pregunta
 */
function addCategoriesFromQuestion(
  cats: CategoriaProfesional[],
  normalizedQuestion: string,
  selected: Set<CategoriaProfesional>,
  maxCategories: number,
): void {
  if (!normalizedQuestion) return;

  for (const cat of cats) {
    if (selected.has(cat)) continue;

    if (questionContainsCategory(cat, normalizedQuestion)) {
      selected.add(cat);
    }

    if (selected.size >= maxCategories) break;
  }
}

/**
 * Completa con categorías comunes hasta alcanzar el máximo
 */
function fillWithCommonCategories(
  cats: CategoriaProfesional[],
  selected: Set<CategoriaProfesional>,
  maxCategories: number,
): void {
  const remaining = maxCategories - selected.size;
  if (remaining <= 0) return;

  let added = 0;
  for (const cat of cats) {
    if (selected.has(cat)) continue;
    selected.add(cat);
    added++;
    if (added >= remaining) break;
  }
}

/**
 * Selecciona categorías relevantes para incluir en el contexto
 * Prioriza:
 * 1. Categorías mencionadas en variables del usuario
 * 2. Categorías que matchean con términos en la pregunta
 * 3. Categorías comunes (primeras N posiciones) como fallback
 *
 * @param cats - Array de categorías profesionales
 * @param userQuestion - Pregunta del usuario (opcional)
 * @param variablesUsuario - Variables extraídas del usuario (opcional)
 * @param maxCategories - Número máximo de categorías a retornar (default: 15)
 * @returns Array de categorías seleccionadas
 */
function selectRelevantCategories(
  cats: CategoriaProfesional[],
  userQuestion?: string,
  variablesUsuario?: Record<string, string>,
  maxCategories = 15,
): CategoriaProfesional[] {
  const selected = new Set<CategoriaProfesional>();
  const normalizedQuestion = userQuestion
    ? normalizeForMatch(userQuestion)
    : "";

  // 1. Priorizar categoría de variables del usuario
  addCategoryFromVariables(cats, variablesUsuario, selected);

  // 2. Buscar categorías mencionadas en la pregunta
  addCategoriesFromQuestion(cats, normalizedQuestion, selected, maxCategories);

  // 3. Completar con categorías comunes
  fillWithCommonCategories(cats, selected, maxCategories);

  return Array.from(selected);
}

/**
 * Formatea Perfil JSON de forma compacta para contexto
 *
 * @param perfil - Perfil del convenio
 * @param userQuestion - Pregunta del usuario (opcional, para búsqueda inteligente)
 * @param variablesUsuario - Variables del usuario (opcional, para priorización)
 * @returns String compacto con info relevante
 */
export function formatPerfilForContext(
  perfil: PerfilContexto,
  userQuestion?: string,
  variablesUsuario?: Record<string, string>,
): string {
  const lines: string[] = [];
  const numeroPagas = perfil.numero_pagas ??
    perfil.tablas_salariales?.num_pagas;

  if (perfil.variables_criticas?.length > 0) {
    lines.push(`Variables criticas: ${perfil.variables_criticas.join(", ")}`);
  }

  const cats = perfil.categorias_profesionales;
  if (cats && cats.length > 0) {
    // Selección inteligente de categorías relevantes
    const selectedCats = selectRelevantCategories(
      cats,
      userQuestion,
      variablesUsuario,
      15, // Aumentado de 10 a 15 para dar más contexto
    );

    const categorias = selectedCats
      .map((c) => {
        if (c.salario_base_anual) {
          return `${c.nombre} (${c.salario_base_anual} euros/ano)`;
        }
        // Para categorías con salarios por establecimiento, mostrar ejemplo
        if (c.salarios && Object.keys(c.salarios).length > 0) {
          const firstSalary = Object.values(c.salarios)[0];
          return `${c.nombre} (${firstSalary} euros/mes clase ${
            Object.keys(c.salarios)[0]
          })`;
        }
        return c.nombre;
      })
      .join(", ");
    lines.push(`Categorias: ${categorias}`);

    // Indicar si hay más categorías disponibles
    if (cats.length > selectedCats.length) {
      lines.push(
        `(${
          cats.length - selectedCats.length
        } categorias adicionales disponibles)`,
      );
    }
  }

  if (perfil.jornada?.horas_anuales) {
    lines.push(`Jornada anual: ${perfil.jornada.horas_anuales} horas`);
  }

  if (typeof numeroPagas === "number") {
    lines.push(`Numero de pagas anuales: ${numeroPagas}`);
  }

  const comps = perfil.complementos;
  if (comps && comps.length > 0) {
    // Formatear complementos con valor
    const complementosBasicos = comps
      .slice(0, 5) // Limitar a 5
      .map((c) => {
        if (c.valor && c.tipo) {
          const unidad = c.tipo === "porcentaje" ? "%" : " euros";
          return `${c.nombre} (${c.valor}${unidad})`;
        }
        return c.nombre;
      })
      .join(", ");
    lines.push(`Complementos: ${complementosBasicos}`);

    // Mostrar excepciones de complementos (IMPORTANTE para calculos correctos)
    const excepciones = comps
      .filter((c) => c.excepcion)
      .map((c) => `- ${c.nombre}: ${c.excepcion}`);
    if (excepciones.length > 0) {
      lines.push(`EXCEPCIONES de complementos:`);
      lines.push(...excepciones);
    }
  }

  if (perfil.tablas_salariales?.ano_referencia) {
    lines.push(
      `Ano tablas salariales: ${perfil.tablas_salariales.ano_referencia}`,
    );
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

  const perfilNormalizado = normalizePerfilContexto(perfil);

  if (perfilNormalizado) {
    if (perfilNormalizado.tablas_salariales?.ano_referencia) {
      context.anoTablas = perfilNormalizado.tablas_salariales.ano_referencia;
    }

    if (perfilNormalizado.jornada?.horas_anuales) {
      context.horasAnuales = perfilNormalizado.jornada.horas_anuales;
    }

    if (perfilNormalizado.variables_criticas?.length > 0) {
      context.variablesFaltantes = [...perfilNormalizado.variables_criticas];
    }

    // Construir opciones de variables
    const categorias = perfilNormalizado.categorias_profesionales;
    if (categorias && categorias.length > 0) {
      context.opcionesVariables = {
        categoria: categorias.map((c) => c.nombre),
      };
    }
  }

  return context;
}

/**
 * Normaliza el perfil para exponer aliases canonicos usados por los prompts.
 *
 * Algunos perfiles llegan con `tablas_salariales.num_pagas`; este helper lo copia
 * a `numero_pagas` para que el prompt pueda consumirlo de forma consistente.
 */
export function normalizePerfilContexto(
  perfil: PerfilContexto | Record<string, unknown> | null,
): PerfilContexto | null {
  if (!perfil) {
    return null;
  }

  const perfilContexto = perfil as PerfilContexto;
  const numeroPagas = typeof perfilContexto.numero_pagas === "number"
    ? perfilContexto.numero_pagas
    : perfilContexto.tablas_salariales?.num_pagas;

  if (typeof numeroPagas !== "number") {
    return perfilContexto;
  }

  return {
    ...perfilContexto,
    numero_pagas: numeroPagas,
  };
}

// ============================================
// FUNCIONES DE BÚSQUEDA EN PERFIL (v2)
// ============================================

/**
 * Normaliza un string para comparación flexible
 * - Minúsculas
 * - Sin acentos
 * - Sin caracteres especiales
 */
function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
    .replace(/[^a-z0-9\s]/g, " ") // Solo alfanuméricos
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Busca una categoría profesional en el perfil por nombre o sinónimos
 *
 * @param perfil - Perfil del convenio
 * @param query - Término de búsqueda (ej: "recepcionista", "ayudante de cocina")
 * @returns La categoría encontrada o null
 *
 * @example
 * const cat = findCategoriaEnPerfil(perfil, "recepcionista");
 * if (cat) {
 *   console.log(cat.nivel); // "III"
 *   console.log(cat.salarios?.["A"]); // 1283.83
 * }
 */
export function findCategoriaEnPerfil(
  perfil: PerfilContexto | null,
  query: string,
): CategoriaProfesional | null {
  if (!perfil?.categorias_profesionales) return null;

  const normalizedQuery = normalizeForMatch(query);

  for (const cat of perfil.categorias_profesionales) {
    // Match por nombre exacto normalizado
    if (normalizeForMatch(cat.nombre) === normalizedQuery) {
      return cat;
    }

    // Match parcial (query contenido en nombre)
    if (normalizeForMatch(cat.nombre).includes(normalizedQuery)) {
      return cat;
    }

    // Match por sinónimos
    if (cat.sinonimos) {
      for (const sinonimo of cat.sinonimos) {
        const normalizedSinonimo = normalizeForMatch(sinonimo);
        if (
          normalizedSinonimo === normalizedQuery ||
          normalizedSinonimo.includes(normalizedQuery)
        ) {
          return cat;
        }
      }
    }
  }

  return null;
}

/**
 * Mapea un tipo de establecimiento a su clase salarial
 *
 * @param perfil - Perfil del convenio
 * @param establecimiento - Tipo de establecimiento (ej: "hotel 4 estrellas", "bar")
 * @returns La clase salarial (A, B, C, D...) o null
 *
 * @example
 * const clase = mapearEstablecimiento(perfil, "hotel 4 estrellas");
 * console.log(clase); // "A"
 */
export function mapearEstablecimiento(
  perfil: PerfilContexto | null,
  establecimiento: string,
): string | null {
  if (!perfil?.mapeo_establecimientos) return null;

  const normalizedEstab = normalizeForMatch(establecimiento);

  // Buscar coincidencia exacta o parcial
  for (const [key, clase] of Object.entries(perfil.mapeo_establecimientos)) {
    const normalizedKey = normalizeForMatch(key);
    if (
      normalizedKey === normalizedEstab ||
      normalizedKey.includes(normalizedEstab) ||
      normalizedEstab.includes(normalizedKey)
    ) {
      return clase;
    }
  }

  return null;
}

/**
 * Resultado de búsqueda de salario en el perfil
 */
export interface SalarioPerfilResult {
  salario: number;
  nivel: string;
  clase: string | null;
  categoria: CategoriaProfesional;
}

/**
 * Intenta obtener el salario de una categoría directamente del perfil
 * sin necesidad de RAG. Útil para consultas salariales directas.
 *
 * @param perfil - Perfil del convenio
 * @param categoria - Nombre de la categoría (ej: "recepcionista")
 * @param establecimiento - Tipo de establecimiento (ej: "hotel 4 estrellas")
 * @returns Objeto con salario y metadata, o null si no encuentra
 *
 * @example
 * const result = getSalarioFromPerfil(perfil, "recepcionista", "hotel 4 estrellas");
 * if (result) {
 *   console.log(result.salario); // 1283.83
 *   console.log(result.nivel); // "III"
 *   console.log(result.clase); // "A"
 * }
 */
export function getSalarioFromPerfil(
  perfil: PerfilContexto | null,
  categoria: string,
  establecimiento?: string,
): SalarioPerfilResult | null {
  const cat = findCategoriaEnPerfil(perfil, categoria);
  if (!cat) return null;

  // Si tiene salarios por tipo de establecimiento
  if (cat.salarios && Object.keys(cat.salarios).length > 0) {
    // Si se especifica establecimiento, mapear a clase
    if (establecimiento) {
      const clase = mapearEstablecimiento(perfil, establecimiento);
      if (clase && cat.salarios[clase] !== undefined) {
        return {
          salario: cat.salarios[clase],
          nivel: cat.nivel || "",
          clase,
          categoria: cat,
        };
      }
    }

    // Sin establecimiento, devolver el primer salario disponible
    const [primeraClase, primerSalario] = Object.entries(cat.salarios)[0];
    return {
      salario: primerSalario,
      nivel: cat.nivel || "",
      clase: primeraClase,
      categoria: cat,
    };
  }

  // Fallback a salario único
  if (cat.salario_base_mensual) {
    return {
      salario: cat.salario_base_mensual,
      nivel: cat.nivel || "",
      clase: null,
      categoria: cat,
    };
  }

  return null;
}
