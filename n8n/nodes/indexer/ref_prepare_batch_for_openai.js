// ============================================
// NODO: Prepare Batch for OpenAI
// TIPO: Code (JavaScript)
// FASE: I1.8
// POSICIÓN: Después de "Prepare Chunks for Insert"
// ============================================

// Obtener datos del input
const inputData = $input.first().json;
const chunks = inputData.chunks;

// Validar que hay chunks
if (!chunks || chunks.length === 0) {
  throw new Error('No hay chunks para generar embeddings');
}

// Preparar textos para embedding
const textos = chunks.map(c => c.contenido);

console.log(`Preparando ${chunks.length} chunks para OpenAI Embeddings API...`);

// Retornar payload separado para OpenAI y metadata interna
return [
  {
    json: {
      // Payload limpio para OpenAI (solo campos requeridos por la API)
      openai_payload: {
        input: textos,
        model: 'text-embedding-3-small',
        encoding_format: 'float'
      },

      // Metadatos internos (NO se envían a OpenAI)
      _chunks_original: chunks,
      _total_chunks: chunks.length,
      _convenio_id: inputData.convenio_id,
      _stats: inputData.stats
    }
  }
];
