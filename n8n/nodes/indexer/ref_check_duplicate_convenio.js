// ============================================
// NODO: Check Duplicate Convenio
// WORKFLOW: Workrules Convenios - Indexer
// TIPO: Code (JavaScript) v2
// FUNCION: Verificar si ya existe un convenio con el mismo codigo_regcon
// ============================================

// NOTA: Solo aplica para flujo BOE/manual que trae codigo_regcon
//       El flujo de upload de usuario NO trae codigo_regcon

const body = $input.first().json.body;
const codigoRegcon = body.codigo_regcon;

// Si no hay codigo_regcon, es un upload de usuario -> continuar sin verificar
// Preservamos la estructura original del body para compatibilidad
if (!codigoRegcon) {
  return [
    {
      json: {
        check_result: 'skip',
        body: body // Preservar estructura para nodos siguientes
      }
    }
  ];
}

// Si hay codigo_regcon, consultar Supabase
const supabaseUrl = $credentials.supabaseApi.url;
const supabaseKey = $credentials.supabaseApi.serviceRoleKey;

const response = await fetch(
  `${supabaseUrl}/rest/v1/convenios?codigo_regcon=eq.${codigoRegcon}&select=id,nombre,estado,codigo_regcon`,
  {
    method: 'GET',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    }
  }
);

const existingConvenios = await response.json();

if (existingConvenios.length > 0) {
  return [
    {
      json: {
        check_result: 'duplicate',
        existing_convenio: existingConvenios[0],
        body: body
      }
    }
  ];
}

return [
  {
    json: {
      check_result: 'new',
      body: body // Preservar estructura para nodos siguientes
    }
  }
];

// ============================================
// OUTPUTS:
// - check_result: 'skip' | 'new' | 'duplicate'
// - body: datos originales del webhook (preservados para compatibilidad)
// - existing_convenio: (solo si duplicate) datos del convenio existente
//
// FLUJOS:
// 1. Upload usuario (sin codigo_regcon): check_result='skip' -> continuar
// 2. BOE/manual nuevo: check_result='new' -> continuar
// 3. BOE/manual duplicado: check_result='duplicate' -> Respond Duplicate
// ============================================
