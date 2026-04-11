/**
 * Expande consultas del usuario con sinónimos del dominio laboral
 * para mejorar la búsqueda semántica en convenios colectivos.
 *
 * @module query-expander
 */

/**
 * Mapa de sinónimos del dominio laboral español.
 * Clave: término que puede usar el usuario
 * Valor: términos alternativos que aparecen en los convenios
 *
 * TODO: Este diccionario manual no escala bien con muchos convenios.
 * En el futuro considerar:
 * - Embeddings semánticos para expansión dinámica
 * - LLM para generar expansiones contextuales
 * - Base de datos de sinónimos por sector/convenio
 */
const LABOR_SYNONYMS: Record<string, string[]> = {
  // Categorías y clasificación profesional
  "grupos profesionales": [
    "niveles retributivos",
    "categorías profesionales",
    "clasificación profesional",
  ],
  "grupo profesional": [
    "nivel retributivo",
    "categoría profesional",
    "clasificación profesional",
  ],
  categorias: ["niveles", "puestos de trabajo", "clasificación"],
  categoria: ["nivel", "puesto de trabajo", "clasificación"],

  // Salarios
  salario: ["retribución", "sueldo", "remuneración", "salario base"],
  sueldo: ["salario", "retribución", "remuneración"],
  paga: ["gratificación", "paga extraordinaria", "mensualidad"],
  pagas: ["gratificaciones", "pagas extraordinarias", "mensualidades"],

  // Jornada
  jornada: ["horario", "tiempo de trabajo", "horas de trabajo"],
  horario: ["jornada", "tiempo de trabajo"],
  "horas extra": ["horas extraordinarias", "trabajo extraordinario"],
  "horas extras": ["horas extraordinarias", "trabajo extraordinario"],

  // Descansos
  vacaciones: ["descanso anual", "período vacacional", "días de vacaciones"],
  descanso: ["libranza", "día libre", "descanso semanal"],
  festivos: ["días festivos", "fiestas", "días inhábiles"],

  // Complementos
  plus: ["complemento", "plus salarial", "complemento salarial"],
  pluses: ["complementos", "complementos salariales"],
  nocturnidad: [
    "trabajo nocturno",
    "complemento de nocturnidad",
    "turno de noche",
  ],
  antiguedad: ["antigüedad", "trienios", "complemento de antigüedad"],

  // Contratos
  contrato: ["relación laboral", "contratación"],
  despido: ["extinción", "cese", "finalización de contrato"],
  indemnizacion: ["indemnización", "compensación por despido"],

  // Permisos
  permiso: ["licencia", "ausencia justificada"],
  permisos: ["licencias", "ausencias justificadas"],
  baja: ["incapacidad temporal", "IT", "enfermedad"],

  // Tipos de establecimiento
  restaurante: ["establecimiento de restauración", "local de hostelería"],
  hotel: ["establecimiento hotelero", "alojamiento"],
  bar: ["establecimiento de bebidas", "cafetería"],
  catering: ["restauración colectiva", "servicios de catering"],

  // Tipos de establecimiento con excepciones especiales
  // Estos términos expanden a "excepto/excluido" para recuperar chunks de excepciones
  whiskeria: [
    "whisquería",
    "bares especiales",
    "sección quinta",
    "excepto manutención",
    "clase B",
  ],
  whisqueria: [
    "whiskería",
    "bares especiales",
    "sección quinta",
    "excepto manutención",
    "clase B",
  ],
  "bar americano": [
    "bares americanos",
    "bares especiales",
    "sección quinta",
    "excepto manutención",
  ],
  "bares americanos": [
    "bar americano",
    "bares especiales",
    "sección quinta",
    "excepto manutención",
  ],
  discoteca: ["salas de fiestas", "salas de baile", "clase A"],
  "sala de fiestas": ["discoteca", "salas de baile", "clase A"],

  // Términos coloquiales de hostelería que NO aparecen en convenios
  // pero que usuarios utilizan frecuentemente
  "camarera de pisos": [
    "personal de limpieza",
    "auxiliar de limpieza",
    "limpiador",
    "limpiadora",
    "camarera de habitaciones",
    "personal de habitaciones",
  ],
  "camarero de pisos": [
    "personal de limpieza",
    "auxiliar de limpieza",
    "limpiador",
    "personal de habitaciones",
  ],
  "camarera de piso": [
    "personal de limpieza",
    "auxiliar de limpieza",
    "limpiadora",
    "camarera de habitaciones",
  ],
  "camarero de piso": [
    "personal de limpieza",
    "auxiliar de limpieza",
    "limpiador",
  ],

  // Otros términos coloquiales comunes
  "pinche de cocina": ["ayudante de cocina", "auxiliar de cocina", "pinche"],
  friegaplatos: ["fregador", "limpiador de vajilla", "fregadora"],
  "jefe de cocina": ["chef", "cocinero jefe"],
  "segundo de cocina": ["segundo jefe de cocina", "subchef"],
  botones: ["mozo de equipaje", "portero", "auxiliar de conserjería"],
  "empleada de hogar": ["personal de limpieza", "limpiadora"],
};

/**
 * Normaliza texto para matching flexible en español, ignorando mayúsculas y acentos.
 */
function normalizeForMatching(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const NORMALIZED_LABOR_SYNONYMS = Object.entries(LABOR_SYNONYMS).map(
  ([term, synonyms]) => [normalizeForMatching(term), synonyms] as const,
);

/**
 * Expande una consulta añadiendo sinónimos relevantes del dominio laboral.
 *
 * @param query - Consulta original del usuario
 * @returns Consulta expandida con sinónimos
 *
 * @example
 * expandQuery("cuáles son los grupos profesionales")
 * // Returns: "cuáles son los grupos profesionales niveles retributivos categorías profesionales"
 */
export function expandQuery(query: string): string {
  const normalizedQuery = normalizeForMatching(query);
  const expansions: string[] = [];

  // Buscar coincidencias de términos y añadir sinónimos
  for (const [term, synonyms] of NORMALIZED_LABOR_SYNONYMS) {
    if (normalizedQuery.includes(term)) {
      // Añadir sinónimos que no estén ya en la consulta
      for (const synonym of synonyms) {
        const normalizedSynonym = normalizeForMatching(synonym);

        if (
          !normalizedQuery.includes(normalizedSynonym) &&
          !expansions.includes(synonym)
        ) {
          expansions.push(synonym);
        }
      }
    }
  }

  // Si hay expansiones, añadirlas a la consulta
  if (expansions.length > 0) {
    // Limitar a máximo 5 expansiones para no sobrecargar el embedding
    const limitedExpansions = expansions.slice(0, 5);
    return `${query} ${limitedExpansions.join(" ")}`;
  }

  return query;
}

/**
 * Verifica si una consulta contiene términos que se beneficiarían de expansión
 *
 * @param query - Consulta a verificar
 * @returns true si la consulta tiene términos expandibles
 */
export function hasExpandableTerms(query: string): boolean {
  const normalizedQuery = normalizeForMatching(query);

  for (const [term] of NORMALIZED_LABOR_SYNONYMS) {
    if (normalizedQuery.includes(term)) {
      return true;
    }
  }

  return false;
}
