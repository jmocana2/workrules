// ============================================
// NODO: Upsert Perfil in Supabase
// FASE: I1.9
// FUNCIÓN: Insertar o actualizar el perfil JSON extraído en convenio_perfiles
// ============================================

// Obtener datos del nodo de validación
const inputData = $input.first().json;
const perfilData = inputData.perfil_data;
const convenioNombre = inputData.convenio_nombre;
const validation = inputData.validation;
const claudeUsage = inputData.claude_usage;

if (!perfilData) {
  throw new Error('No hay perfil_data para insertar');
}

// Obtener convenio_id real (UUID) de la tabla convenios
// El convenio_id que tenemos es el codigo_regcon del webhook,
// necesitamos el UUID de la tabla convenios
const convenioData = $('Save md in supabase1').first().json;
const convenioUuid = convenioData.id;

if (!convenioUuid) {
  throw new Error('No se pudo obtener el UUID del convenio de la tabla convenios');
}

console.log(`Upserting perfil para convenio: ${convenioNombre} (${convenioUuid})`);

// Preparar el payload para Supabase REST API
// Usamos upsert: si ya existe un perfil para este convenio, lo actualizamos
const supabaseUrl = $credentials.supabaseApi.url;
const supabaseKey = $credentials.supabaseApi.serviceRoleKey;

// Primero verificar si ya existe un perfil para este convenio
const checkResponse = await fetch(
  `${supabaseUrl}/rest/v1/convenio_perfiles?convenio_id=eq.${convenioUuid}&select=id`,
  {
    method: 'GET',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    }
  }
);

if (!checkResponse.ok) {
  const errorText = await checkResponse.text();
  throw new Error(`Error al verificar perfil existente: ${checkResponse.status} - ${errorText}`);
}

const existingPerfiles = await checkResponse.json();
const existingId = existingPerfiles.length > 0 ? existingPerfiles[0].id : null;

let response;

if (existingId) {
  // UPDATE: ya existe un perfil, actualizarlo
  console.log(`Actualizando perfil existente: ${existingId}`);
  response = await fetch(
    `${supabaseUrl}/rest/v1/convenio_perfiles?id=eq.${existingId}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        perfil_data: perfilData,
        updated_at: new Date().toISOString()
      })
    }
  );
} else {
  // INSERT: no existe, crear nuevo
  console.log('Insertando nuevo perfil');
  response = await fetch(
    `${supabaseUrl}/rest/v1/convenio_perfiles`,
    {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        convenio_id: convenioUuid,
        perfil_data: perfilData
      })
    }
  );
}

if (!response.ok) {
  const errorText = await response.text();
  throw new Error(`Error al guardar perfil en Supabase: ${response.status} - ${errorText}`);
}

const savedData = await response.json();
const savedPerfil = Array.isArray(savedData) ? savedData[0] : savedData;

console.log(`✓ Perfil ${existingId ? 'actualizado' : 'insertado'} correctamente`);
console.log(`  - Perfil ID: ${savedPerfil.id}`);
console.log(`  - Convenio: ${convenioNombre}`);
console.log(`  - Categorías: ${validation.stats.categorias}`);
console.log(`  - Complementos: ${validation.stats.complementos}`);

return [{
  json: {
    perfil_id: savedPerfil.id,
    convenio_id: convenioUuid,
    convenio_nombre: convenioNombre,
    operation: existingId ? 'updated' : 'inserted',
    validation: validation,
    claude_usage: claudeUsage
  }
}];
