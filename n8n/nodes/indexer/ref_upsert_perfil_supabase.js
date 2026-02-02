// ============================================
// NODO: Upsert Perfil in Supabase
// FASE: I1.9
// FUNCIÓN: Insertar o actualizar el perfil JSON extraído en convenio_perfiles
// ============================================

// Obtener datos del nodo de validación
const inputData = $input.first().json;
const perfilData = inputData.perfil_data;
const convenioNombre = inputData.convenio_nombre;
const validation = inputData.validation || { stats: {}, is_valid: false };
const claudeUsage = inputData.claude_usage;

if (!perfilData) {
  throw new Error('No hay perfil_data para insertar');
}

// Obtener convenio_id real (UUID) de la tabla convenios
// El convenio_id que tenemos es el codigo_regcon del webhook,
// necesitamos el UUID de la tabla convenios
const convenioItem = $('Save md in supabase1').first();
if (!convenioItem?.json?.id) {
  throw new Error(
    'No se pudo obtener el UUID del convenio de la tabla convenios'
  );
}
const convenioUuid = convenioItem.json.id;
console.log(
  `Upserting perfil para convenio: ${convenioNombre} (${convenioUuid})`
);

// Preparar el payload para Supabase REST API
// Usamos upsert atómico: si ya existe un perfil para este convenio, lo actualizamos
const supabaseUrl = $credentials.supabaseApi.url;
const supabaseKey = $credentials.supabaseApi.serviceRoleKey;

// UPSERT atómico usando on_conflict para evitar race conditions
console.log('Ejecutando upsert atómico de perfil');
const response = await fetch(
  `${supabaseUrl}/rest/v1/convenio_perfiles?on_conflict=convenio_id`,
  {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify({
      convenio_id: convenioUuid,
      perfil_data: perfilData
    })
  }
);

if (!response.ok) {
  const errorText = await response.text();
  throw new Error(
    `Error al guardar perfil en Supabase: ${response.status} - ${errorText}`
  );
}

const savedData = await response.json();
const savedPerfil = Array.isArray(savedData) ? savedData[0] : savedData;

console.log('✓ Perfil guardado correctamente (upsert atómico)');
console.log(`  - Perfil ID: ${savedPerfil.id}`);
console.log(`  - Convenio: ${convenioNombre}`);
console.log(`  - Categorías: ${validation?.stats?.categorias || 0}`);
console.log(`  - Complementos: ${validation?.stats?.complementos || 0}`);

return [
  {
    json: {
      perfil_id: savedPerfil.id,
      convenio_id: convenioUuid,
      convenio_nombre: convenioNombre,
      operation: 'upserted',
      validation: validation,
      claude_usage: claudeUsage
    }
  }
];
