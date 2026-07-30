// ============================================
// NODO: Check Duplicate By Expediente
// UBICACIÓN: entre "Extract Metadata from Markdown" y "Heuristic Score"
// FUNCIÓN: Rechazar como duplicado sólo si otro convenio ya tiene el mismo
//          numero_expediente_regcon (una versión concreta ya publicada).
//          Distinto expediente con el mismo codigo_convenio NO es duplicado:
//          es una nueva versión de la familia.
//
// Contexto: docs/analysis/convenio-familias-plan.md §2.2
// ============================================

const input = $input.first().json;
const numeroExpediente = input.numero_expediente_regcon;

// Si no se pudo extraer el expediente, no podemos verificar duplicado exacto.
// Dejamos pasar — la familia se resolverá luego por codigo_convenio.
if (!numeroExpediente) {
  return [
    {
      json: {
        ...input,
        duplicate_check: 'skip',
      },
    },
  ];
}

const supabaseUrl = $credentials.supabaseApi.url;
const supabaseKey = $credentials.supabaseApi.serviceRoleKey;

const response = await fetch(
  `${supabaseUrl}/rest/v1/convenios?numero_expediente_regcon=eq.${encodeURIComponent(numeroExpediente)}&select=id,nombre,estado`,
  {
    method: 'GET',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
  }
);

if (!response.ok) {
  const text = await response.text();
  throw new Error(
    `Supabase check duplicate falló: HTTP ${response.status} — ${text}`
  );
}

const existing = await response.json();

if (Array.isArray(existing) && existing.length > 0) {
  return [
    {
      json: {
        ...input,
        duplicate_check: 'duplicate',
        existing_convenio: existing[0],
      },
    },
  ];
}

return [
  {
    json: {
      ...input,
      duplicate_check: 'new',
    },
  },
];
