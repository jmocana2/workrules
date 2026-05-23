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
let userMessage = 'Error desconocido procesando el convenio. Inténtalo de nuevo en unos minutos.';

const errorMessage = errorData.message || JSON.stringify(errorData);
const failedNode = errorData.node?.name || 'Unknown';

// Usar else-if para asegurar clasificación mutualmente exclusiva
if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
  errorType = 'DUPLICATE_PDF';
  userMessage = 'El PDF ya existe en el almacenamiento. Se puede reutilizar el existente.';
}
else if (errorMessage.includes('duplicate key') && errorMessage.includes('codigo_regcon')) {
  errorType = 'DUPLICATE_CONVENIO';
  userMessage = 'Ya existe un convenio con este código REGCON en la base de datos.';
}
else if (errorMessage.includes('timeout') && errorMessage.includes('PENDING')) {
  errorType = 'LLAMAPARSE_TIMEOUT';
  shouldRetry = true;
  userMessage = 'El procesamiento del PDF está tardando más de lo esperado. Por favor, inténtalo de nuevo.';
}
else if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
  errorType = 'AUTH_ERROR';
  userMessage = 'Error de autenticación con servicios externos. El equipo ha sido notificado.';
}
else if (errorMessage.includes('404') || errorMessage.includes('ENOTFOUND')) {
  errorType = 'PDF_NOT_FOUND';
  userMessage = 'No se pudo descargar el PDF desde la URL proporcionada. Verifica que el archivo es accesible.';
}

// Intentar obtener convenio_id del payload del webhook para poder marcarlo como error
const convenioId = webhookData?.convenio_id || null;

return {
  json: {
    workflow: 'ingesta-convenio',
    error_type: errorType,
    error_message: errorMessage,
    user_message: userMessage,
    should_retry: shouldRetry,
    failed_node: failedNode,
    input_data: webhookData,
    convenio_id: convenioId,
    timestamp: new Date().toISOString()
  }
};
