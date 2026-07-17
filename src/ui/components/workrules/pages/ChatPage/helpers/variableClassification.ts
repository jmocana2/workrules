/**
 * Keywords normalizadas que identifican una variable "identificadora": sin
 * ella no se puede aplicar una tabla salarial concreta. Debe mantenerse
 * alineada con la normalización del backend (lowercase, sin acentos,
 * separadores colapsados a espacio).
 */
const IDENTIFYING_KEYWORDS = [
  "categoria",
  "puesto",
  "nivel",
  "tipo establecimiento",
  "tipo de establecimiento",
  "clase",
  "zona",
  "ambito",
  "grupo",
  "area",
];

/**
 * Normaliza un nombre de variable con las mismas reglas que el backend:
 * lowercase, sin acentos, separadores (`_`, `-`) y múltiples espacios
 * colapsados a un espacio.
 */
function normalizeVariableName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Decide si una variable crítica del perfil es "identificadora": sin ella no
 * se puede aplicar una tabla salarial concreta (categoría, nivel/tipo de
 * establecimiento, zona/ámbito territorial, grupo profesional).
 *
 * Las moduladoras (jornada, antigüedad, turno, horas extra, pluses) NO
 * bloquean; se asume default y se aclara en la respuesta de Claude.
 */
export function isIdentifyingVariable(name: string): boolean {
  const normalized = normalizeVariableName(name);
  return IDENTIFYING_KEYWORDS.some((kw) => normalized.includes(kw));
}

/**
 * Convierte "tipo_establecimiento" → "Tipo establecimiento" para mostrarlo
 * como label legible en DataRequestCard y chips de variables.
 */
export function humanizeVariableLabel(name: string): string {
  const cleaned = name.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}
