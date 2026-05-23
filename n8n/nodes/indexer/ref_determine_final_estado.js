// ============================================
// NODO: Determine Final Estado
// FUNCIÓN: Decide si el convenio termina como 'activo' o 'activo_sin_perfil'
//          según si el perfil Claude se generó correctamente.
// ============================================

let operation = 'skipped';
let perfilData = null;
let validation = null;

try {
  const upsert = $('Upsert Perfil Supabase').first().json;
  operation = upsert.operation || 'skipped';
  validation = upsert.validation || null;
} catch {
  // Si Upsert Perfil Supabase falló en runtime, asumimos sin perfil
  operation = 'skipped';
}

try {
  perfilData = $('Validate Perfil JSON').first().json.perfil_data || null;
} catch {
  perfilData = null;
}

const webhookBody = $('Webhook').first().json.body;
const convenioId = webhookBody.convenio_id;

// Si NO se hizo upsert del perfil o el perfil no es válido, marcar como activo_sin_perfil.
// El RAG (chunks) sigue funcionando pero el calculador salarial se debe deshabilitar.
const hasValidProfile = operation === 'upserted' && perfilData;
const estado = hasValidProfile ? 'activo' : 'activo_sin_perfil';

return [{
  json: {
    convenio_id: convenioId,
    estado,
    nombre_oficial: perfilData?.convenio || null,
    nombre_corto: perfilData?.nombre_corto || null,
    ambito_territorial: perfilData?.ambito_territorial || null,
    ambito: perfilData?.ambito || null,
    has_valid_profile: hasValidProfile,
    validation
  }
}];