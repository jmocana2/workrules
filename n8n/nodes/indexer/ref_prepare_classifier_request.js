// ============================================
// NODO: Prepare Classifier Request (Capa 2)
// FUNCIÓN: Construye payload Anthropic para Claude Haiku 4.5
// ============================================

const upstream = $('Heuristic Score').first().json;

// Truncar a ~12000 caracteres (~3000 tokens) para abaratar la llamada.
const MAX_CHARS = 12000;
const snippet = (upstream.markdown_completo || '').slice(0, MAX_CHARS);

const SYSTEM_PROMPT = `Eres un clasificador estricto de documentos laborales españoles.
Dado el texto inicial de un documento, debes determinar a qué categoría pertenece.
Categorías permitidas:
- convenio_colectivo
- boletin_oficial (BOE/BOCM/DOG... con contenido laboral)
- acuerdo_empresa
- acta_mesa_negociadora
- contrato_individual
- nomina
- otro_laboral (manual interno, política RR.HH., reglamento)
- no_laboral

Responde ÚNICAMENTE con un JSON válido, sin texto antes ni después, con esta forma exacta:
{ "categoria": "...", "confianza": 0.0, "indicios": ["..."] }
Donde "confianza" es un número entre 0 y 1.`;

const userPrompt = `Texto del documento (primeros ${snippet.length} caracteres):\n\n${snippet}`;

const payload = {
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 256,
  temperature: 0,
  system: [
    { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }
  ],
  messages: [{ role: 'user', content: userPrompt }]
};

return [{
  json: {
    payload,
    convenio_id: upstream.convenio_id,
    nombre: upstream.nombre,
    visibilidad: upstream.visibilidad,
    markdown_completo: upstream.markdown_completo,
    heuristic_score: upstream.heuristic_score,
    heuristic_hits: upstream.heuristic_hits,
    heuristic_early_reject: upstream.heuristic_early_reject
  }
}];