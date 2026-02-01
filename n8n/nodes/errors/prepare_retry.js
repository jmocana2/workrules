// ============================================
// NODO: Prepare Retry
// WORKFLOW: Workrules Errors
// FUNCIÓN: Preparar contexto de reintento y pasar error original para logging
// ============================================

// Por ahora solo loguear que se debería reintentar
// Pero pasar el error original para que se guarde en logs
const originalError = $input.first().json;

return {
  json: {
    ...originalError,
    // Añadir contexto de retry
    retry_context: {
      action: 'RETRY_NEEDED',
      message: 'Este caso requiere reintento manual',
      timestamp: new Date().toISOString()
    }
  }
};
