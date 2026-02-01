// ============================================
// NODO: Clear Retry Counter
// WORKFLOW: Workrules Convenios - Indexer
// TIPO: Code (JavaScript) v2
// ============================================

// Limpiar contador de reintentos cuando el job completa exitosamente
const markdownResult = $input.first().json;

// Obtener job ID del nodo de status check
const statusCheck = $('Check LlamaParse Status').first();
if (statusCheck && statusCheck.json && statusCheck.json.id) {
  const jobId = statusCheck.json.id;

  // Limpiar contador de este job en static data
  const staticData = $getWorkflowStaticData('node');
  if (staticData.llamaparseRetries && staticData.llamaparseRetries[jobId]) {
    console.log(`Limpiando contador de reintentos para job ${jobId}`);
    delete staticData.llamaparseRetries[jobId];
  }
}

// Pasar los datos sin modificar
return {
  json: markdownResult
};
