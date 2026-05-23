// ============================================
// NODO: Heuristic Score (Capa 3 de validación)
// FUNCIÓN: Scoring rápido por keywords. Si score muy bajo y visibilidad=publico,
//          podemos rechazar sin gastar Claude.
// ============================================

const upstream = $('Extract and clean md1').first().json;
const markdown = (upstream.markdown_completo || '').toLowerCase();
const webhookBody = $('Webhook').first().json.body || {};
const visibilidad = webhookBody.visibilidad || 'privado';

const KEYWORDS = [
  'convenio', 'colectivo', 'salario', 'jornada', 'categoría profesional',
  'categoria profesional', 'vacaciones', 'artículo', 'articulo',
  'boe', 'código convenio', 'codigo convenio', 'regcon',
  'antigüedad', 'antiguedad', 'horas extraordinarias', 'pagas extra',
  'mesa negociadora', 'acuerdo', 'condiciones de trabajo', 'trabajador'
];

let score = 0;
const hits = [];
for (const kw of KEYWORDS) {
  if (markdown.includes(kw)) {
    score += 1;
    hits.push(kw);
  }
}

// Si el documento es manifiestamente no laboral y se quiere público, rechazo temprano.
const HEURISTIC_REJECT_THRESHOLD = 2;
const earlyReject = visibilidad === 'publico' && score < HEURISTIC_REJECT_THRESHOLD;

return [{
  json: {
    markdown_completo: upstream.markdown_completo,
    convenio_id: upstream.convenio_id,
    nombre: upstream.nombre,
    visibilidad,
    heuristic_score: score,
    heuristic_hits: hits,
    heuristic_early_reject: earlyReject
  }
}];