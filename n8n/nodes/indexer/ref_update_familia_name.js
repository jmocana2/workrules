// ============================================
// NODO: Update Familia Name
// UBICACIÓN: tras "Validate Perfil JSON" (antes de escribir perfil o en paralelo)
// FUNCIÓN: Si en el paso Resolve or Create Familia se creó una familia nueva
//          (placeholder "convenio-<codigo>"), y Claude devolvió un nombre_corto
//          decente en el perfil, actualizar nombre_canonico de la familia.
//
// No-op si:
//   - familia_creada === false
//   - familia_id === null
//   - el perfil no trae nombre_corto
//
// Contexto: docs/analysis/convenio-familias-plan.md §2.3 + pregunta abierta #1
// ============================================

const input = $input.first().json;

// Recuperar contexto de nodos anteriores. Resolve or Create Familia añadió
// familia_id y familia_creada; Validate Perfil JSON expone perfil_data.
let familiaId = input.familia_id;
let familiaCreada = input.familia_creada;

// Si el flujo aguas abajo perdió esos campos (algunos nodos hacen return
// selectivo), los recuperamos del nodo original.
if (familiaId === undefined || familiaCreada === undefined) {
  try {
    const resolveNode = $('Resolve or Create Familia').first().json;
    familiaId = resolveNode.familia_id;
    familiaCreada = resolveNode.familia_creada;
  } catch (e) {
    console.log(
      `[update_familia_name] No se pudo leer 'Resolve or Create Familia': ${e.message}`
    );
    return [{ json: { ...input, familia_name_updated: false } }];
  }
}

if (!familiaCreada || !familiaId) {
  return [
    {
      json: { ...input, familia_name_updated: false, skip_reason: 'no-new-family' },
    },
  ];
}

const perfil = input.perfil_data || {};
const nombreCorto = perfil.nombre_corto || perfil.convenio;

if (!nombreCorto || typeof nombreCorto !== 'string') {
  return [
    {
      json: { ...input, familia_name_updated: false, skip_reason: 'no-nombre-corto' },
    },
  ];
}

const supabaseUrl = $credentials.supabaseApi.url;
const supabaseKey = $credentials.supabaseApi.serviceRoleKey;

const res = await fetch(
  `${supabaseUrl}/rest/v1/convenio_familias?id=eq.${familiaId}`,
  {
    method: 'PATCH',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      nombre_canonico: nombreCorto,
      sector: perfil.ambito || null,
      ambito_territorial: perfil.ambito_territorial || null,
    }),
  }
);

if (!res.ok) {
  const errTxt = await res.text();
  throw new Error(
    `Supabase PATCH convenio_familias falló: HTTP ${res.status} — ${errTxt}`
  );
}

console.log(
  `[update_familia_name] Familia ${familiaId} actualizada: nombre_canonico="${nombreCorto}"`
);

return [
  {
    json: {
      ...input,
      familia_name_updated: true,
      familia_nombre_canonico: nombreCorto,
    },
  },
];
