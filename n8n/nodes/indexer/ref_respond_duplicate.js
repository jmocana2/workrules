// ============================================
// NODO: Respond Duplicate Convenio
// WORKFLOW: Workrules Convenios - Indexer
// TIPO: Code (JavaScript) v2
// FUNCION: Responder que el convenio ya existe sin procesar el PDF
// ============================================

// Obtener datos del nodo anterior (Check Duplicate Convenio)
const data = $input.first().json;
const existingConvenio = data.existing_convenio;
const body = data.body;

// Construir respuesta informativa
return [
  {
    json: {
      status: 'duplicate',
      message: 'El convenio ya existe en el sistema',
      existing_convenio: {
        id: existingConvenio.id,
        nombre: existingConvenio.nombre,
        estado: existingConvenio.estado,
        codigo_regcon: existingConvenio.codigo_regcon
      },
      requested: {
        nombre: body.nombre,
        codigo_regcon: body.codigo_regcon
      },
      action_required: 'none'
    }
  }
];

// ============================================
// NOTAS:
// - Este nodo se ejecuta cuando el IF detecta que ya existe un convenio
//   con el mismo codigo_regcon en la base de datos
// - Solo aplica al flujo BOE/manual (con codigo_regcon)
// - El flujo de upload de usuario (sin codigo_regcon) hace "skip"
// - Evita procesar el PDF con LlamaParse/Claude/OpenAI innecesariamente
// - Ahorra ~2-3 minutos de procesamiento y ~$0.10 en costes de API
// - El webhook responde inmediatamente (~200ms) con info del convenio existente
// ============================================
