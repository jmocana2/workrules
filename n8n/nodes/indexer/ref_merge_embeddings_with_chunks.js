// ============================================
// NODO: Merge Embeddings with Chunks
// TIPO: Code (JavaScript)
// FASE: I1.8
// POSICIÓN: Después de "HTTP Request OpenAI Embeddings"
// ============================================

// Obtener respuesta de OpenAI del nodo HTTP anterior
const inputItem = $input.first();
if (!inputItem) {
  throw new Error('No se recibió respuesta del nodo HTTP de OpenAI');
}
const openAIResponse = inputItem.json;

// Obtener chunks originales que passamos desde "Prepare Batch for OpenAI"
const prepareNodeItem = $('Prepare Batch for OpenAI').first();
if (!prepareNodeItem) {
  throw new Error(
    'No se encontraron datos del nodo "Prepare Batch for OpenAI"'
  );
}
const prepareNode = prepareNodeItem.json;
const chunks = prepareNode._chunks_original;
const convenioId = prepareNode._convenio_id;

if (!chunks || !Array.isArray(chunks)) {
  throw new Error('Chunks originales no encontrados o formato inválido');
}

// Validar que OpenAI retornó los embeddings
if (!openAIResponse.data || !Array.isArray(openAIResponse.data)) {
  throw new Error('Respuesta inválida de OpenAI API: falta campo "data"');
}

const embeddings = openAIResponse.data;

// Validar que hay chunks para procesar
if (!chunks || chunks.length === 0) {
  throw new Error('No hay chunks para combinar con embeddings');
}

// Validar que la cantidad coincide
if (embeddings.length !== chunks.length) {
  throw new Error(
    `Mismatch en embeddings: ${chunks.length} chunks pero ${embeddings.length} embeddings recibidos`
  );
}

// Combinar chunks con sus embeddings (defensivamente)
const chunksWithEmbeddings = chunks.map((chunk, index) => ({
  ...chunk,
  embedding: (embeddings[index] && embeddings[index].embedding) || null
}));

// Validar que al menos un embedding tiene la dimensión correcta (1536 para text-embedding-3-small)
const firstNonEmptyEmbedding = chunksWithEmbeddings.find(c =>
  Array.isArray(c.embedding)
);

if (!firstNonEmptyEmbedding) {
  throw new Error(
    'No se encontraron embeddings válidos. Todos los chunks tienen embeddings nulos o indefinidos.'
  );
}

if (firstNonEmptyEmbedding.embedding.length !== 1536) {
  throw new Error(
    `Embedding dimension incorrecta: esperado 1536, recibido ${firstNonEmptyEmbedding.embedding.length}`
  );
}

// Advertir si hay chunks sin embeddings
const chunksWithoutEmbeddings = chunksWithEmbeddings.filter(
  c => !Array.isArray(c.embedding)
);
if (chunksWithoutEmbeddings.length > 0) {
  console.warn(
    `⚠️ ${chunksWithoutEmbeddings.length} chunks sin embeddings válidos`
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
console.log(
  `  - Coste estimado: $${embeddingUsage.estimated_cost_usd.toFixed(6)}`
);

// Preparar array para insert en Supabase con validación de metadata
const insertData = chunksWithEmbeddings
  .map((chunk, index) => {
    // Validar que el chunk tiene metadata válida
    if (!chunk.metadata || typeof chunk.metadata !== 'object') {
      console.warn(
        `⚠️ Chunk ${index} carece de metadata válida, usando valores por defecto`
      );
      return {
        convenio_id: chunk.convenio_id,
        contenido: chunk.contenido,
        chunk_index: index, // Usar índice del array como fallback
        metadata: { numero_chunk: index, warning: 'metadata_missing' },
        embedding: chunk.embedding
      };
    }

    // Validar que numero_chunk existe
    const chunkIndex =
      typeof chunk.metadata.numero_chunk === 'number'
        ? chunk.metadata.numero_chunk
        : index; // Fallback al índice si no existe

    if (typeof chunk.metadata.numero_chunk !== 'number') {
      console.warn(
        `⚠️ Chunk ${index} carece de numero_chunk, usando índice ${index}`
      );
    }

    return {
      convenio_id: chunk.convenio_id,
      contenido: chunk.contenido,
      chunk_index: chunkIndex,
      metadata: chunk.metadata,
      embedding: chunk.embedding // IMPORTANTE: Incluir el embedding
    };
  })
  .filter(chunk => chunk !== null); // Filtrar chunks nulos si hubiese alguno

// Contar chunks con embeddings válidos de 1536 dimensiones
const validEmbeddingsCount = insertData.filter(
  item =>
    item.embedding &&
    Array.isArray(item.embedding) &&
    item.embedding.length === 1536
).length;

console.log(
  `✓ Preparados ${insertData.length} chunks para inserción en Supabase`
);

// Log condicional basado en embeddings válidos
if (validEmbeddingsCount === insertData.length) {
  console.log(`  - Todos los chunks tienen embeddings de dimensión 1536`);
} else {
  console.log(
    `  - ${validEmbeddingsCount}/${insertData.length} chunks con embeddings válidos de 1536 dimensiones`
  );
  console.log(
    `  - ⚠️ ${insertData.length - validEmbeddingsCount} chunks con embeddings faltantes o inválidos`
  );
}

return [
  {
    json: {
      chunks: insertData,
      total_chunks: insertData.length,
      embedding_usage: embeddingUsage,
      convenio_id: convenioId
    }
  }
];
