// ============================================
// NODO: Merge Embeddings with Chunks
// TIPO: Code (JavaScript)
// FASE: I1.8
// POSICIÓN: Después de "HTTP Request OpenAI Embeddings"
// ============================================

// Obtener respuesta de OpenAI del nodo HTTP anterior
const openAIResponse = $input.first().json;

// Obtener chunks originales que pasamos desde "Prepare Batch for OpenAI"
const prepareNode = $('Prepare Batch for OpenAI').first().json;
const chunks = prepareNode._chunks_original;
const convenioId = prepareNode._convenio_id;

// Validar que OpenAI retornó los embeddings
if (!openAIResponse.data || !Array.isArray(openAIResponse.data)) {
  throw new Error('Respuesta inválida de OpenAI API: falta campo "data"');
}

const embeddings = openAIResponse.data;

// Validar que la cantidad coincide
if (embeddings.length !== chunks.length) {
  throw new Error(
    `Mismatch en embeddings: ${chunks.length} chunks pero ${embeddings.length} embeddings recibidos`
  );
}

// Combinar chunks con sus embeddings
const chunksWithEmbeddings = chunks.map((chunk, index) => ({
  ...chunk,
  embedding: embeddings[index].embedding
}));

// Validar que los embeddings tienen la dimensión correcta (1536 para text-embedding-3-small)
const firstEmbedding = chunksWithEmbeddings[0].embedding;
if (!firstEmbedding || firstEmbedding.length !== 1536) {
  throw new Error(
    `Embedding dimension incorrecta: esperado 1536, recibido ${firstEmbedding?.length || 0}`
  );
}

// Calcular estadísticas de uso
const usage = openAIResponse.usage || {};
const embeddingUsage = {
  total_tokens: usage.total_tokens || 0,
  prompt_tokens: usage.prompt_tokens || 0,
  chunks_processed: chunks.length,
  model: openAIResponse.model || 'text-embedding-3-small',
  estimated_cost_usd: ((usage.total_tokens || 0) / 1000000) * 0.02 // $0.02 por 1M tokens
};

console.log(`✓ Embeddings generados exitosamente:`);
console.log(`  - Chunks procesados: ${embeddingUsage.chunks_processed}`);
console.log(`  - Tokens consumidos: ${embeddingUsage.total_tokens}`);
console.log(`  - Coste estimado: $${embeddingUsage.estimated_cost_usd.toFixed(6)}`);

// Preparar array para insert en Supabase
const insertData = chunksWithEmbeddings.map(chunk => ({
  convenio_id: chunk.convenio_id,
  contenido: chunk.contenido,
  chunk_index: chunk.metadata.numero_chunk,
  metadata: chunk.metadata,
  embedding: chunk.embedding // IMPORTANTE: Incluir el embedding
}));

console.log(`✓ Preparados ${insertData.length} chunks para inserción en Supabase`);
console.log(`  - Todos los chunks tienen embeddings de dimensión 1536`);

return [{
  json: {
    chunks: insertData,
    total_chunks: insertData.length,
    embedding_usage: embeddingUsage,
    convenio_id: convenioId
  }
}];
