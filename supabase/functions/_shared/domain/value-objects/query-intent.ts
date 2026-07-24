// supabase/functions/_shared/domain/value-objects/query-intent.ts
//
// Intención del mensaje del usuario, computada a partir de heurísticas de
// texto. Encapsula los regex que hoy viven en `variable-extractor.isSalaryQuery`
// y elimina los if/else dispersos por handlers.

export type QueryIntentKind = "salary_calculation" | "informational";

export type QueryIntent = {
  readonly kind: QueryIntentKind;
  readonly __brand: "QueryIntent";
};

// Palabras que indican "quiero calcular / cuánto se cobra".
const SALARY_KEYWORDS = [
  /cuanto\s+(?:cobra|gana|se\s+paga|es\s+el\s+sueldo)/,
  /calcul(?:a|ame|ar)\s+(?:el\s+)?(?:sueldo|salario|nomina)/,
  /(?:mi\s+|el\s+)?(?:sueldo|salario|nomina)/,
  /(?:valor|precio)\s+(?:de\s+)?(?:las?\s+)?horas?\s+extra/,
  /plus\s+de\s+nocturnidad/,
  /coste\s+laboral/,
];

// Patrones de pregunta informativa sobre el articulado del convenio.
const INFORMATIVE_KEYWORDS = [
  /que\s+(?:dice|establece|indica)\s+(?:el\s+)?(?:articulo|convenio)/,
  /articulo\s+\d+/,
  /(?:cuantos?|cuantas?)\s+dias\s+de\s+vacaciones/,
  /como\s+funciona\s+(?:el\s+)?despido/,
];

function normalize(message: string): string {
  return message
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

function matchesSalary(normalized: string): boolean {
  return SALARY_KEYWORDS.some((r) => r.test(normalized));
}

function matchesInformative(normalized: string): boolean {
  return INFORMATIVE_KEYWORDS.some((r) => r.test(normalized));
}

/**
 * Clasifica un mensaje en intención de cálculo salarial vs informativa.
 *
 * @param message - Mensaje crudo del usuario.
 * @param hasProfileData - `true` si el usuario ya envió variables (respuesta
 *   a un DataRequestCard); sesga la clasificación hacia `salary_calculation`
 *   para no perder el flujo iniciado.
 */
export function classifyQueryIntent(
  message: string,
  hasProfileData: boolean,
): QueryIntent {
  const normalized = normalize(message);

  if (hasProfileData && !matchesInformative(normalized)) {
    return { kind: "salary_calculation", __brand: "QueryIntent" };
  }

  if (matchesInformative(normalized)) {
    return { kind: "informational", __brand: "QueryIntent" };
  }

  if (matchesSalary(normalized)) {
    return { kind: "salary_calculation", __brand: "QueryIntent" };
  }

  return { kind: "informational", __brand: "QueryIntent" };
}
