// ============================================
// NODO: Check Retry Limit
// WORKFLOW: Workrules Convenios - Indexer
// TIPO: Code (JavaScript) v2
// ============================================

// Controlar límite de reintentos para LlamaParse polling
const MAX_RETRIES = 10;

// Obtener datos actuales del status check
const currentData = $input.first().json;
const jobId = currentData.id;

if (!jobId) {
  throw new Error('No se encontró job ID en la respuesta de LlamaParse');
}

// Obtener workflow static data para almacenamiento persistente
const staticData = $getWorkflowStaticData('node');

// Inicializar estructura de contadores si no existe
if (!staticData.llamaparseRetries) {
  staticData.llamaparseRetries = {};
}

// Obtener o inicializar contador para este job
let retryCount = staticData.llamaparseRetries[jobId] || 0;

// Incrementar contador
retryCount++;
staticData.llamaparseRetries[jobId] = retryCount;

console.log(`Reintento LlamaParse #${retryCount}/${MAX_RETRIES} - Job: ${jobId} - Status: ${currentData.status}`);

// Si excedemos el límite, lanzar error
if (retryCount > MAX_RETRIES) {
  // Limpiar contador antes de fallar
  delete staticData.llamaparseRetries[jobId];

  throw new Error(
    `LlamaParse polling excedió el límite de ${MAX_RETRIES} reintentos. ` +
    `Último status: ${currentData.status}. Job ID: ${jobId}`
  );
}

// Pasar los datos sin modificar (el contador está en static data)
return {
  json: currentData
};
