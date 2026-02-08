// ============================================
// NODO: Process Error
// WORKFLOW: Workrules Errors
// FUNCIÓN: Clasificar y categorizar errores del workflow de ingesta
// ============================================

// Obtener información del error
const error = $input.first();
const errorData = error.json;

// Obtener datos del webhook para contexto
let webhookData = null;
try {
  webhookData = $('Webhook').first().json.body;
} catch {
  webhookData = { error: 'No se pudo obtener datos del webhook' };
}

// Clasificar el error
let errorType = 'UNKNOWN';
let shouldRetry = false;
let userMessage = 'Error desconocido procesando el convenio';

const errorMessage = errorData.message || JSON.stringify(errorData);

// Usar else-if para asegurar clasificación mutualmente exclusiva
// 1. PDF ya existe en Storage
if (
  errorMessage.includes('already exists') ||
  errorMessage.includes('duplicate')
) {
  errorType = 'DUPLICATE_PDF';
  userMessage =
    'El PDF ya existe en el almacenamiento. Se puede reutilizar el existente.';
}
// 2. Convenio ya existe (unique constraint codigo_regcon)
else if (
  errorMessage.includes('duplicate key') &&
  errorMessage.includes('codigo_regcon')
) {
  errorType = 'DUPLICATE_CONVENIO';
  userMessage =
    'Ya existe un convenio con este código REGCON en la base de datos.';
}
// 3. Timeout de LlamaParse
else if (errorMessage.includes('timeout') && errorMessage.includes('PENDING')) {
  errorType = 'LLAMAPARSE_TIMEOUT';
  shouldRetry = true;
  userMessage = 'El procesamiento del PDF está tardando más de lo esperado.';
}
// 4. Error de autenticación API
else if (
  errorMessage.includes('401') ||
  errorMessage.includes('unauthorized')
) {
  errorType = 'AUTH_ERROR';
  userMessage = 'Error de autenticación con las APIs externas.';
}
// 5. PDF no descargable
else if (errorMessage.includes('404') || errorMessage.includes('ENOTFOUND')) {
  errorType = 'PDF_NOT_FOUND';
  userMessage = 'No se pudo descargar el PDF desde la URL proporcionada.';
}

return {
  json: {
    workflow: 'ingesta-convenio',
    error_type: errorType,
    error_message: errorMessage,
    user_message: userMessage,
    should_retry: shouldRetry,
    failed_node: errorData.node?.name || 'Unknown',
    input_data: webhookData,
    timestamp: new Date().toISOString()
  }
};
