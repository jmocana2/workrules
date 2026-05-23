// ============================================
// NODO: Parse Classification (Capa 2)
// FUNCIÓN: Parsea la respuesta de Claude, junta con la heurística y decide
//          si el documento es aceptable según la visibilidad solicitada.
// ============================================

const http = $input.first().json;
const prep = $('Prepare Classifier Request').first().json;

// Categorías admisibles para visibilidad pública
const PUBLIC_OK = new Set([
  'convenio_colectivo',
  'boletin_oficial',
  'acuerdo_empresa',
  'acta_mesa_negociadora'
]);
const MIN_CONFIDENCE_PUBLIC = 0.7;
const MIN_CONFIDENCE_PRIVATE = 0.5;

let classification = { categoria: 'desconocido', confianza: 0, indicios: [] };
let classifierError = null;

if (http && http.error) {
  classifierError = http.error.message || 'Error desconocido en clasificador';
} else {
  try {
    const responseText = http?.content?.[0]?.text || '';
    // Limpieza por si Claude devuelve fences
    let cleaned = responseText.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    classification = JSON.parse(cleaned.trim());
  } catch (e) {
    classifierError = 'No se pudo parsear la respuesta del clasificador: ' + e.message;
  }
}

// Decisión final
const { categoria, confianza } = classification;
const visibilidad = prep.visibilidad || 'privado';

let accepted = false;
let rejectReason = null;

if (prep.heuristic_early_reject) {
  rejectReason = `El documento no parece laboral (heuristic_score=${prep.heuristic_score}) y se ha solicitado visibilidad pública.`;
} else if (classifierError) {
  // Fail-open en privado, fail-closed en público
  if (visibilidad === 'publico') {
    rejectReason = 'No se pudo clasificar el documento y se ha solicitado visibilidad pública: ' + classifierError;
  } else {
    accepted = true;
  }
} else if (visibilidad === 'publico') {
  if (PUBLIC_OK.has(categoria) && confianza >= MIN_CONFIDENCE_PUBLIC) {
    accepted = true;
  } else {
    rejectReason = `Para visibilidad pública solo se admiten convenios, boletines oficiales o acuerdos sectoriales. Detectado: ${categoria} (confianza ${confianza}).`;
  }
} else {
  // privado: aceptar todo salvo no_laboral con confianza alta
  if (categoria === 'no_laboral' && confianza >= MIN_CONFIDENCE_PRIVATE) {
    rejectReason = 'El documento no parece laboral. Si crees que es un error, vuelve a intentarlo con otro PDF.';
  } else {
    accepted = true;
  }
}

const clasificacion = {
  categoria: classification.categoria || null,
  confianza: classification.confianza ?? null,
  indicios: classification.indicios || [],
  heuristic_score: prep.heuristic_score,
  heuristic_hits: prep.heuristic_hits,
  modelo: 'claude-haiku-4-5-20251001',
  classifier_error: classifierError
};

return [{
  json: {
    convenio_id: prep.convenio_id,
    nombre: prep.nombre,
    visibilidad,
    markdown_completo: prep.markdown_completo,
    accepted,
    reject_reason: rejectReason,
    clasificacion
  }
}];