/**
 * Extrae variables laborales del mensaje del usuario
 *
 * Detecta categoria profesional, jornada, horas extra, nocturnidad,
 * antiguedad y nivel de establecimiento usando patrones regex.
 *
 * @module variable-extractor
 */

import type { PerfilContexto } from "./prompts.ts";
import type { ExtractedVariables } from "./types.ts";

// ============================================
// HELPERS DE EXTRACCION
// ============================================

/**
 * Extrae un numero seguido de un patron
 * @param text - Texto donde buscar
 * @param suffix - Patron que sigue al numero (sin el numero)
 */
function extractNumberBefore(text: string, suffix: RegExp): number | null {
  // Construir patron: digitos + espacio opcional + suffix
  const fullPattern = new RegExp(`(\\d+)\\s?${suffix.source}`, "i");
  const match = text.match(fullPattern);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Extrae jornada del mensaje
 */
function extractJornada(text: string): "completa" | "parcial" | null {
  if (/jornada\s{1,3}completa/i.test(text)) return "completa";
  if (/tiempo\s{1,3}completo/i.test(text)) return "completa";
  if (/40\s?h\b/i.test(text)) return "completa";
  if (/jornada\s{1,3}parcial/i.test(text)) return "parcial";
  if (/tiempo\s{1,3}parcial/i.test(text)) return "parcial";
  if (/media\s{1,3}jornada/i.test(text)) return "parcial";
  return null;
}

/**
 * Extrae horas semanales del mensaje
 */
function extractHorasSemanales(text: string): number | null {
  // "20 horas semanales", "20h semanales", "20h/semana", "20 horas a la semana"
  const patterns = [
    /h\s{0,2}semanales/,
    /horas\s{0,2}semanales/,
    /h\/semana/,
    /horas a la semana/,
  ];
  for (const p of patterns) {
    const result = extractNumberBefore(text, p);
    if (result !== null) return result;
  }
  return null;
}

/**
 * Extrae horas extra del mensaje
 */
function extractHorasExtra(text: string): number | null {
  // "10 horas extra", "10h extra"
  const patterns = [/h\s{0,2}extra/, /horas\s{0,2}extra/];
  for (const p of patterns) {
    const result = extractNumberBefore(text, p);
    if (result !== null) return result;
  }
  return null;
}

/**
 * Extrae horas nocturnas del mensaje
 */
function extractHorasNocturnas(text: string): number | null {
  // "5 horas nocturnas", "5h nocturnas", "5 horas de noche", "5 horas de nocturnidad"
  const patterns = [
    /h\s{0,2}nocturnas/,
    /horas\s{0,2}nocturnas/,
    /horas de noche/,
    /h de noche/,
    /horas de nocturnidad/,
  ];
  for (const p of patterns) {
    const result = extractNumberBefore(text, p);
    if (result !== null) return result;
  }
  return null;
}

/**
 * Extrae digitos del final de un string (sin regex)
 */
function extractTrailingDigits(str: string): number | null {
  let digits = "";
  for (let i = str.length - 1; i >= 0; i--) {
    const char = str[i];
    if (char >= "0" && char <= "9") {
      digits = char + digits;
    } else if (digits.length > 0) {
      break;
    }
  }
  return digits.length > 0 ? parseInt(digits, 10) : null;
}

/**
 * Extrae antiguedad del mensaje usando busqueda de texto simple
 * Evita regex complejos que disparan sonarjs/slow-regex
 */
function extractAntiguedad(text: string): number | null {
  // Buscar patrones de antiguedad (de mas especifico a menos)
  const patterns = [
    "años de antig",
    "anos de antig",
    "años antig",
    "anos antig",
    "a de antig",
  ];

  for (const pattern of patterns) {
    const idx = text.indexOf(pattern);
    if (idx > 0) {
      // Buscar digitos antes del patron
      const before = text.slice(Math.max(0, idx - 5), idx).trim();
      const num = extractTrailingDigits(before);
      if (num !== null) return num;
    }
  }

  return null;
}

/**
 * Extrae nivel de hotel del mensaje
 */
function extractNivelHotel(text: string): string | null {
  // "hotel 4 estrellas", "hotel de 4 estrellas"
  const match = text.match(/hotel\s{0,2}(?:de\s{0,2})?(\d)\s{0,2}estrellas?/i);
  return match ? `${match[1]} estrellas` : null;
}

/**
 * Normaliza un nombre de variable: minusculas, sin acentos, espacios -> guion bajo.
 * Convierte "Categoría Profesional" -> "categoria_profesional", "Antigüedad" -> "antiguedad".
 */
export function normalizeVariableName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

/**
 * Mapeo desde nombre normalizado de la variable critica a la clave canonica
 * de ExtractedVariables. Si no esta aqui, se usa el nombre normalizado tal cual.
 */
const CANONICAL_VARIABLE_KEYS: Record<string, keyof ExtractedVariables> = {
  categoria: "categoria",
  categoria_profesional: "categoria",
  jornada: "jornada",
  tipo_de_jornada: "jornada",
  nivel_de_establecimiento: "nivelEstablecimiento",
  nivel_establecimiento: "nivelEstablecimiento",
  tipo_de_establecimiento: "nivelEstablecimiento",
  antiguedad: "antiguedadAnos",
};

/**
 * Devuelve la clave en `ExtractedVariables` que debe usarse para una variable
 * critica concreta. Para variables conocidas (categoria, jornada, etc.) usa la
 * clave canonica; para el resto usa el propio nombre normalizado, lo que permite
 * al extractor poblar variables arbitrarias del perfil (ej: "turno", "zona").
 */
export function resolveVariableKey(variableCritica: string): string {
  const normalized = normalizeVariableName(variableCritica);
  return (CANONICAL_VARIABLE_KEYS[normalized] as string | undefined) ??
    normalized;
}

/**
 * Busca, para cada variable critica del perfil, alguno de sus valores posibles
 * dentro del mensaje. Si encuentra match, lo asigna a la clave resuelta
 * (canonica si aplica, normalizada si no).
 *
 * Esto hace al extractor agnostico al sector: ya no depende de regex
 * especificos por dominio (hostelería); usa la verdad declarada en el perfil.
 */
function extractFromValoresPosibles(
  message: string,
  perfil: PerfilContexto,
  variables: ExtractedVariables,
): void {
  const valoresPosibles = perfil.valores_posibles;
  const variablesCriticas = perfil.variables_criticas || [];
  if (!valoresPosibles || variablesCriticas.length === 0) return;

  const normalizedMessage = normalizeVariableName(message).replace(/_/g, " ");

  for (const varCritica of variablesCriticas) {
    const key = resolveVariableKey(varCritica);
    if (variables[key] !== undefined) continue; // ya extraída por otro camino

    // Buscar los `valores_posibles` indexados con varias normalizaciones del
    // nombre, porque el indexer no siempre normaliza igual.
    const normalizedCritica = normalizeVariableName(varCritica);
    const candidates =
      valoresPosibles[varCritica] ??
      valoresPosibles[normalizedCritica] ??
      valoresPosibles[normalizedCritica.replace(/_/g, " ")] ??
      valoresPosibles[key];
    if (!candidates || candidates.length === 0) continue;

    // Ordenar por longitud descendente para preferir match mas especifico
    const sorted = [...candidates].sort((a, b) => b.length - a.length);
    for (const valor of sorted) {
      const normalizedValor = normalizeVariableName(valor).replace(/_/g, " ");
      // Salvaguardas contra matches espurios:
      // - longitud minima de 4 caracteres (evita "a", "b", "c", "1")
      // - match por palabra completa (word boundaries en el texto normalizado),
      //   para que "primera" no haga match dentro de "primeramente".
      if (normalizedValor.length < 4) continue;
      if (matchesAsWord(normalizedMessage, normalizedValor)) {
        variables[key] = valor;
        break;
      }
    }
  }
}

/**
 * Comprueba si `needle` aparece en `haystack` rodeado de limites de palabra
 * (inicio/fin de string o caracter no alfanumerico). Asume que ambos ya
 * estan en la misma normalizacion (lowercase, sin acentos, separadores como
 * espacios).
 */
function matchesAsWord(haystack: string, needle: string): boolean {
  let from = 0;
  while (from <= haystack.length - needle.length) {
    const idx = haystack.indexOf(needle, from);
    if (idx === -1) return false;
    const before = idx === 0 ? "" : haystack[idx - 1];
    const after = idx + needle.length >= haystack.length
      ? ""
      : haystack[idx + needle.length];
    const isWordChar = (c: string) => /[a-z0-9]/.test(c);
    if (!isWordChar(before) && !isWordChar(after)) return true;
    from = idx + 1;
  }
  return false;
}

/**
 * Busca una categoria profesional conocida en el mensaje
 * Busca tanto en el nombre como en los sinónimos de la categoría
 */
function findCategoria(
  message: string,
  categorias: Array<{ nombre: string; sinonimos?: string[] }>,
): string | undefined {
  const lowerMessage = message.toLowerCase();

  // Ordenar por longitud descendente (match mas especifico primero)
  const sorted = [...categorias].sort(
    (a, b) => b.nombre.length - a.nombre.length,
  );

  for (const cat of sorted) {
    // Buscar en nombre
    if (lowerMessage.includes(cat.nombre.toLowerCase())) {
      return cat.nombre;
    }

    // Buscar en sinónimos
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

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

/**
 * Extrae variables laborales del mensaje del usuario
 *
 * @param message - Mensaje del usuario
 * @param perfil - Perfil del convenio (para categorias conocidas)
 * @returns Variables extraidas
 *
 * @example
 * const vars = extractVariables(
 *   "Calcula salario de gobernanta en hotel 4 estrellas",
 *   perfil
 * );
 * // { categoria: "Gobernanta", nivelEstablecimiento: "4 estrellas" }
 */
export function extractVariables(
  message: string,
  perfil?: PerfilContexto | null,
): ExtractedVariables {
  const variables: ExtractedVariables = {};
  const lowerMessage = message.toLowerCase();

  // Extraer jornada
  const jornada = extractJornada(lowerMessage);
  if (jornada) {
    variables.jornada = jornada;
    if (jornada === "completa") variables.horasSemanales = 40;
  }

  // Extraer horas semanales especificas (sobreescribe si existe)
  const horasSemanales = extractHorasSemanales(lowerMessage);
  if (horasSemanales !== null) {
    variables.horasSemanales = horasSemanales;
    variables.jornada = horasSemanales >= 35 ? "completa" : "parcial";
  }

  // Extraer horas extra
  const horasExtra = extractHorasExtra(lowerMessage);
  if (horasExtra !== null) variables.horasExtra = horasExtra;

  // Extraer horas nocturnas
  const horasNocturnas = extractHorasNocturnas(lowerMessage);
  if (horasNocturnas !== null) variables.horasNocturnas = horasNocturnas;

  // Extraer antiguedad
  const antiguedad = extractAntiguedad(lowerMessage);
  if (antiguedad !== null) variables.antiguedadAnos = antiguedad;

  // Extraer nivel hotel
  const nivelHotel = extractNivelHotel(lowerMessage);
  if (nivelHotel !== null) variables.nivelEstablecimiento = nivelHotel;

  // Extraer categoria profesional (match contra perfil)
  if (perfil?.categorias_profesionales) {
    const categoria = findCategoria(message, perfil.categorias_profesionales);
    if (categoria) variables.categoria = categoria;
  }

  // Extraer variables genericas del perfil (agnostico al sector)
  // Itera variables_criticas y busca cualquiera de sus valores_posibles
  // en el mensaje. Cubre niveles/grupos/zonas/turnos de cualquier convenio.
  if (perfil) {
    extractFromValoresPosibles(message, perfil, variables);
  }

  return variables;
}

/**
 * Verifica si el mensaje es una pregunta informativa sobre el convenio
 * (busca información, no cálculo)
 *
 * @param message - Mensaje del usuario (en minúsculas)
 * @returns true si parece pregunta informativa
 */
function isInformativeQuestion(message: string): boolean {
  // Patrones que indican búsqueda de información, no cálculo
  const informativePatterns = [
    /qu[ée]\s{1,3}dice/i, // "qué dice el convenio"
    /qu[ée]\s{1,3}establece/i, // "qué establece"
    /qu[ée]\s{1,3}indica/i, // "qué indica"
    /qu[ée]\s{1,3}regula/i, // "qué regula"
    /qu[ée]\s{1,3}contempla/i, // "qué contempla"
    /c[oó]mo\s{1,3}(?:se\s{1,3})?regula/i, // "cómo se regula"
    /c[oó]mo\s{1,3}funciona/i, // "cómo funciona"
    /informaci[oó]n\s{1,3}sobre/i, // "información sobre"
    /explica(?:me)?\s/i, // "explícame", "explica"
    /cu[aá]l\s{1,3}es\s{1,3}(?:el|la)\s{1,3}regulaci[oó]n/i, // "cuál es la regulación"
    /existe\s{1,3}(?:el|la|un|una)?/i, // "existe plus de..."
    /hay\s{1,3}(?:alg[uú]n|alguna)/i, // "hay algún plus"
    /seg[uú]n\s{1,3}el\s{1,3}convenio/i, // "según el convenio"
    /art[ií]culo/i, // pregunta sobre artículo específico
  ];

  for (const pattern of informativePatterns) {
    if (pattern.test(message)) return true;
  }

  return false;
}

/** Keywords simples que indican consulta salarial */
const SALARY_KEYWORDS = [
  "salario",
  "sueldo",
  "nocturnidad",
  "nomina",
  "nómina",
];

/**
 * Patrones que indican continuacion de un flujo de calculo salarial.
 * El front envia mensajes como "Mis datos son: ..." cuando el usuario
 * responde a un DataRequestCard, y respuestas cortas tipo "Primera",
 * "4 estrellas", "manana" cuando aclara una variable. Estos deben
 * enrutarse a calculateSalary (no a askQuestion) para que el clasificador
 * re-evalue las variables y, si faltan identificadoras, vuelva a mostrar
 * el card en vez de soltar texto suelto.
 */
const SALARY_CONTINUATION_PATTERNS: RegExp[] = [
  /^mis\s+datos\s+son\s*:/i,
  /^mi\s+respuesta\s+es\s*:/i,
  /^categoria\s+profesional\s*:/i,
  /^tipo\s+(?:de\s+)?establecimiento\s*:/i,
];

/** Patrones regex que indican consulta salarial */
// Nota: los mensajes ya vienen normalizados (lowercase + sin acentos) cuando
// llegan a estos patrones, asi que no hace falta contemplar tildes aqui.
const SALARY_PATTERNS: RegExp[] = [
  // "cuanto cobra/gana/paga/cobraria/ganaria/pagaria..."
  // Permitimos hasta 3 palabras intermedias para cubrir
  // "cuanto cobraria yo", "cuanto me pagan", "cuanto seria mi..."
  /cuant[oa]\s{1,3}(?:(?:me|te|le|se|yo|tu|el|ella|usted)\s{1,3}){0,2}(?:cobr|gan|pag)/i,
  // "cuanto seria/sera/es mi salario/sueldo/nomina"
  /cuant[oa]\s{1,3}(?:ser[ia]a?|es)\s{1,3}(?:mi|el|la|tu)?\s{0,3}(?:salario|sueldo|nomina|retribuc|paga)/i,
  // "que cobraria/ganaria/pagaria" (sin "cuanto")
  /que\s{1,3}(?:(?:me|te|le|yo|tu)\s{1,3}){0,2}(?:cobr|gan|pag)(?:aria|eria|are|ere|aran|eran)/i,
  // "cuanto me corresponde / toca"
  /cuant[oa]\s{1,3}(?:me|te|le)\s{1,3}(?:corresponde|toca|tocaria|correspondería|correspond)/i,
  /calcula(?:r|me)?/i,
  /horas?\s{1,3}extra/i,
  /retribucion/i,
  /precio\s{1,3}hora/i,
  /valor\s{1,3}hora/i,
  /coste\s{1,3}laboral/i,
  /plus(?:es)?/i,
  /complemento(?:s)?/i,
  // "mi/la nomina/salario/sueldo" como objeto de la pregunta
  /(?:mi|la|el)\s{1,3}(?:nomina|salario|sueldo|paga\s{1,3}mensual)/i,
  // Patrones para rangos/tablas salariales
  /rangos?\s{0,3}salarial/i,
  /tabla.{0,20}(?:salario|sueldo|rangos?|retribuc)/i,
  /muestr(?:a|ame).{0,30}(?:rangos?|tabla)/i,
  /todos?\s{0,3}los\s{0,3}rangos/i,
];

/**
 * Verifica si el mensaje contiene keywords o patrones salariales
 */
function matchesSalaryPatterns(message: string): boolean {
  // Buscar keywords simples
  for (const kw of SALARY_KEYWORDS) {
    if (message.includes(kw)) return true;
  }

  // Buscar patrones regex
  for (const pattern of SALARY_PATTERNS) {
    if (pattern.test(message)) return true;
  }

  return false;
}

/**
 * Verifica si el mensaje parece una consulta de calculo salarial
 * (vs una pregunta general sobre el convenio)
 *
 * @param message - Mensaje del usuario
 * @returns true si parece consulta de salario
 *
 * @example
 * isSalaryQuery("cuanto cobra un camarero?"); // true
 * isSalaryQuery("que dice el articulo 14?"); // false
 * isSalaryQuery("que dice el convenio sobre horas extraordinarias?"); // false
 */
/**
 * Normaliza un mensaje para clasificacion: lowercase + sin acentos.
 * Necesario porque los patrones salariales se escriben sin tildes
 * (ej: `cuant[oa]` no matchea "cuánto" con tilde).
 */
function normalizeForClassification(message: string): string {
  return message
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function isSalaryQuery(message: string): boolean {
  const normalized = normalizeForClassification(message);

  // Continuacion de flujo de calculo (respuesta a DataRequestCard, aclaracion).
  // Comprobar ANTES que isInformativeQuestion, porque "Mis datos son: ..."
  // no debe interpretarse como pregunta informativa.
  for (const pattern of SALARY_CONTINUATION_PATTERNS) {
    if (pattern.test(normalized)) return true;
  }

  // Si es una pregunta informativa, no es consulta de salario
  if (isInformativeQuestion(normalized)) {
    return false;
  }

  return matchesSalaryPatterns(normalized);
}

/**
 * Verifica si el mensaje es una solicitud de mostrar rangos/opciones/tabla salarial
 * (sin necesidad de variables especificas)
 *
 * @param message - Mensaje del usuario
 * @returns true si es solicitud de mostrar rangos u opciones
 */
export function isShowRangesRequest(message: string): boolean {
  const lowerMessage = normalizeForClassification(message);

  // Patrones especificos para "ver todos los rangos" o "mostrar opciones"
  const patterns = [
    /no\s{1,3}(?:lo\s{1,3})?(?:se|conozco).{0,20}(?:rangos?|tabla|opciones)/i,
    /muestr(?:a|ame).{0,20}(?:todos?\s{0,3}los\s{0,3})?rangos/i,
    /(?:ver|mostrar)\s{1,3}todos?\s{0,3}los\s{0,3}rangos/i,
    /tabla\s{1,3}(?:completa|con\s{1,3}todos)/i,
    /todos?\s{0,3}los\s{0,3}(?:rangos?|salarios?)\s{0,3}posibles/i,
    // Nuevos patrones para solicitud de opciones/tipos/clases
    /tipos?\s{1,3}de\s{1,3}establecimiento/i,
    /clases?\s{1,3}(?:de\s{1,3}establecimiento|disponibles)/i,
    /muestr(?:a|ame).{0,30}(?:tipos?|clases?|opciones).{0,20}(?:disponibles|del\s{1,3}convenio)/i,
    /para\s{1,3}[a-záéíóúñ\s]{1,40},?\s{0,3}muestr(?:a|ame)/i,
  ];

  for (const pattern of patterns) {
    if (pattern.test(lowerMessage)) return true;
  }

  return false;
}

/**
 * Combina variables extraidas con variables conocidas previas
 * Las nuevas tienen prioridad sobre las previas
 *
 * @param previous - Variables de turnos anteriores
 * @param current - Variables extraidas del mensaje actual
 * @returns Variables combinadas
 */
export function mergeVariables(
  previous: ExtractedVariables | undefined,
  current: ExtractedVariables,
): ExtractedVariables {
  if (!previous) {
    return current;
  }

  return {
    ...previous,
    ...current,
  };
}

/**
 * Convierte las claves de las variables conocidas (vienen del front con el
 * nombre crudo del perfil, ej: "categoria_profesional", "tipo_establecimiento")
 * a la clave canonica usada por el clasificador (ej: "categoria",
 * "nivelEstablecimiento"). Las claves desconocidas se mantienen tal cual.
 */
const CANONICAL_FIELDS = new Set<string>([
  "categoria",
  "jornada",
  "horasSemanales",
  "horasExtra",
  "horasNocturnas",
  "antiguedadAnos",
  "nivelEstablecimiento",
]);

export function normalizeKnownVariables(
  raw: Record<string, string | number | undefined> | undefined,
): ExtractedVariables | undefined {
  if (!raw) return undefined;
  const result: ExtractedVariables = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined) continue;
    // Si la clave ya es un campo canonico (caso interno/test/legacy),
    // se preserva tal cual. Si es un nombre crudo del perfil
    // ("categoria_profesional"), se resuelve a su clave canonica.
    const canonical = CANONICAL_FIELDS.has(key) ? key : resolveVariableKey(key);
    result[canonical] = value;
  }
  return result;
}
