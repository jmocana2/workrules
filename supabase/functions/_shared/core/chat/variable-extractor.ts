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
 * Busca una categoria profesional conocida en el mensaje
 */
function findCategoria(
  message: string,
  categorias: Array<{ nombre: string }>,
): string | undefined {
  const lowerMessage = message.toLowerCase();

  // Ordenar por longitud descendente (match mas especifico primero)
  const sorted = [...categorias].sort(
    (a, b) => b.nombre.length - a.nombre.length,
  );

  for (const cat of sorted) {
    if (lowerMessage.includes(cat.nombre.toLowerCase())) {
      return cat.nombre;
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
export function isSalaryQuery(message: string): boolean {
  const lowerMessage = message.toLowerCase();

  // Si es una pregunta informativa, no es consulta de salario
  if (isInformativeQuestion(lowerMessage)) {
    return false;
  }

  const keywords = [
    "salario",
    "sueldo",
    "nocturnidad",
    "nomina",
    "nómina",
  ];

  // Buscar keywords simples
  for (const kw of keywords) {
    if (lowerMessage.includes(kw)) return true;
  }

  // Patrones mas complejos
  if (/cuant[oa]\s{1,3}(?:cobr|gan|pag)/i.test(lowerMessage)) return true;
  if (/calcula(?:r|me)?/i.test(lowerMessage)) return true;
  if (/horas?\s{1,3}extra/i.test(lowerMessage)) return true;
  if (/retribuci[oó]n/i.test(lowerMessage)) return true;
  if (/precio\s{1,3}hora/i.test(lowerMessage)) return true;
  if (/valor\s{1,3}hora/i.test(lowerMessage)) return true;
  if (/coste\s{1,3}laboral/i.test(lowerMessage)) return true;
  if (/plus(?:es)?/i.test(lowerMessage)) return true;
  if (/complemento(?:s)?/i.test(lowerMessage)) return true;

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
