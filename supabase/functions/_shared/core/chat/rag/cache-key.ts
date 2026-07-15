/**
 * Construye el texto que se embebe para la cache semántica incluyendo las
 * variables conocidas. Sin esto, dos preguntas idénticas con variables
 * distintas (p. ej. turno mañana vs. tarde) colisionarían en la cache.
 */
export function buildCacheKeyText(
  expandedQuery: string,
  variables: Record<string, string | number | undefined> | undefined,
): string {
  if (!variables) return expandedQuery;
  const entries = Object.entries(variables)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}=${v}`)
    .sort();
  if (entries.length === 0) return expandedQuery;
  return `${expandedQuery} [variables: ${entries.join(", ")}]`;
}
