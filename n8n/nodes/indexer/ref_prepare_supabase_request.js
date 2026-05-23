// ============================================
// NODO: Prepare Supabase Request
// FASE: I1.9
// ============================================

const inputData = $input.first().json;

// Si la validación marcó error (rama falló), pasar sin insertar
if (!inputData.perfil_data) {
  console.log('⚠ Sin perfil_data para insertar, saltando upsert');
  return [{
    json: {
      skip_upsert: true,
      perfil_id: null,
      convenio_id: null,
      convenio_nombre: inputData.convenio_nombre,
      operation: 'skipped',
      validation: inputData.validation,
      claude_usage: inputData.claude_usage
    }
  }];
}

const perfilData = inputData.perfil_data;
const convenioNombre = inputData.convenio_nombre;
const validation = inputData.validation;
const claudeUsage = inputData.claude_usage;

// Obtener UUID real del convenio
const convenioData = $('Save md in supabase1').first().json;
const convenioUuid = Array.isArray(convenioData) ? convenioData[0].id : convenioData.id;

if (!convenioUuid) {
  throw new Error('No se pudo obtener UUID del convenio');
}

console.log(`Preparando upsert perfil: ${convenioNombre} (${convenioUuid})`);

// Preparar payload para INSERT
const insertPayload = {
  convenio_id: convenioUuid,
  perfil_data: perfilData
};

return [{
  json: {
    skip_upsert: false,
    convenio_uuid: convenioUuid,
    insert_payload: insertPayload,
    convenio_nombre: convenioNombre,
    validation: validation,
    claude_usage: claudeUsage
  }
}];