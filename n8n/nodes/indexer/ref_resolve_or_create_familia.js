// ============================================
// NODO: Resolve or Create Familia
// UBICACIÓN: entre "Check Duplicate By Expediente" y "Heuristic Score"
// FUNCIÓN: A partir de codigo_convenio (14 dígitos del BOE), buscar la
//          familia. Si no existe, crearla con nombre_canonico placeholder.
//          El nombre "bonito" se actualiza más tarde, cuando Claude
//          devuelve `nombre_corto` en el perfil.
//
// Salida: familia_id (UUID) y familia_creada (boolean) para saber si hay
// que rellenar el nombre después.
//
// Contexto: docs/analysis/convenio-familias-plan.md §2.3
// ============================================

const input = $input.first().json;
const codigoConvenio = input.codigo_convenio;

// Sin codigo_convenio no podemos agrupar: familia unipersonal → NULL.
if (!codigoConvenio) {
  console.log('[resolve_familia] Sin codigo_convenio; familia_id=NULL');
  return [
    {
      json: {
        ...input,
        familia_id: null,
        familia_creada: false,
      },
    },
  ];
}

const supabaseUrl = $credentials.supabaseApi.url;
const supabaseKey = $credentials.supabaseApi.serviceRoleKey;
const headers = {
  apikey: supabaseKey,
  Authorization: `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json',
};

// 1. Buscar familia existente
const getRes = await fetch(
  `${supabaseUrl}/rest/v1/convenio_familias?codigo_convenio=eq.${encodeURIComponent(codigoConvenio)}&select=id`,
  { method: 'GET', headers }
);

if (!getRes.ok) {
  throw new Error(
    `Supabase GET convenio_familias falló: HTTP ${getRes.status} — ${await getRes.text()}`
  );
}

const found = await getRes.json();
if (Array.isArray(found) && found.length > 0) {
  console.log(`[resolve_familia] Familia existente: ${found[0].id}`);
  return [
    {
      json: {
        ...input,
        familia_id: found[0].id,
        familia_creada: false,
      },
    },
  ];
}

// 2. Crear nueva familia con placeholder
const placeholder = `convenio-${codigoConvenio}`;
const insertBody = {
  codigo_convenio: codigoConvenio,
  nombre_canonico: placeholder,
};

const postRes = await fetch(`${supabaseUrl}/rest/v1/convenio_familias`, {
  method: 'POST',
  headers: {
    ...headers,
    Prefer: 'return=representation',
  },
  body: JSON.stringify(insertBody),
});

if (!postRes.ok) {
  const errTxt = await postRes.text();

  // Race condition: otra ejecución simultánea creó la familia entre nuestro
  // GET y nuestro POST. El UNIQUE(codigo_convenio) protege — reintentamos GET.
  if (postRes.status === 409) {
    const retry = await fetch(
      `${supabaseUrl}/rest/v1/convenio_familias?codigo_convenio=eq.${encodeURIComponent(codigoConvenio)}&select=id`,
      { method: 'GET', headers }
    );
    const retryData = await retry.json();
    if (Array.isArray(retryData) && retryData.length > 0) {
      console.log(
        `[resolve_familia] Familia creada en paralelo por otro proceso: ${retryData[0].id}`
      );
      return [
        {
          json: {
            ...input,
            familia_id: retryData[0].id,
            familia_creada: false,
          },
        },
      ];
    }
  }

  throw new Error(
    `Supabase POST convenio_familias falló: HTTP ${postRes.status} — ${errTxt}`
  );
}

const created = await postRes.json();
const familiaId = Array.isArray(created) ? created[0].id : created.id;
console.log(
  `[resolve_familia] Familia creada: ${familiaId} (nombre_canonico=${placeholder})`
);

return [
  {
    json: {
      ...input,
      familia_id: familiaId,
      familia_creada: true,
    },
  },
];
