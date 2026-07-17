/**
 * Categorías profesionales conocidas para detectar el contexto del último
 * mensaje del usuario cuando responde "No lo sé" a un DataRequestCard.
 * Ordenadas para que las variantes más específicas (p.ej. "ayudante de
 * cocina") se detecten antes que las genéricas ("cocinero").
 */
const KNOWN_PROFESSIONAL_CATEGORIES = [
  "ayudante de cocina",
  "jefe de cocina",
  "cocinero",
  "camarero",
  "ayudante de camarero",
  "recepcionista",
  "gobernanta",
  "pinche",
  "barman",
  "jefe de sala",
  "camarera de pisos",
];

/**
 * Construye una pregunta sintética para el modo cálculo salarial cuando el
 * usuario no ha escrito texto pero ha seleccionado variables identificadoras
 * como chips. Se envía al backend como si fuera un mensaje redactado.
 */
export function buildSyntheticPrompt(
  variables: Record<string, string>,
  humanize: (name: string) => string,
): string {
  const parts = Object.entries(variables).map(
    ([name, value]) => `${humanize(name)}=${value}`,
  );
  return `Calcula el salario con: ${parts.join(", ")}`;
}

/**
 * Construye el prompt de fallback cuando el usuario responde "No lo sé" en
 * un DataRequestCard: intenta detectar la categoría profesional en el
 * último mensaje del usuario y pide al backend las opciones disponibles del
 * convenio en vez de un cálculo concreto.
 */
export function buildFallbackOptionsPrompt(
  lastUserMessage: string,
  knownCategories: readonly string[] = KNOWN_PROFESSIONAL_CATEGORIES,
): string {
  const contexto = lastUserMessage.toLowerCase();

  let categoriaDetectada = "";
  for (const cat of knownCategories) {
    if (contexto.includes(cat)) {
      categoriaDetectada = cat;
      break;
    }
  }

  if (categoriaDetectada) {
    return `Para ${categoriaDetectada}, muestrame los tipos de establecimiento y clases disponibles en el convenio con sus salarios correspondientes`;
  }

  return "Muestrame los tipos de establecimiento, clases y categorias profesionales disponibles en el convenio";
}
