// ============================================
// NODO: Prepare Chunks for Insert (ACTUALIZADO I1.8)
// FUNCIÓN: Preparar chunks con embeddings para insert en Supabase
// ============================================

// Validar que hay input
const inputItem = $input.first();
if (!inputItem) {
  throw new Error(
    'No hay datos de entrada. Verifica que el nodo anterior esté conectado.'
  );
}

// Obtener todos los chunks con embeddings del nodo anterior
const data = inputItem.json;
if (!data || typeof data !== 'object') {
  throw new Error('Datos de entrada inválidos. Se esperaba un objeto JSON.');
}

const chunks = data.chunks;

// Validar que tenemos chunks
if (!chunks || chunks.length === 0) {
  throw new Error('No hay chunks para preparar');
}

// Validar que los chunks tienen embeddings
const hasEmbeddings = chunks.every(
  chunk =>
    chunk.embedding &&
    Array.isArray(chunk.embedding) &&
    chunk.embedding.length === 1536
);

if (!hasEmbeddings) {
  throw new Error(
    'Algunos chunks no tienen embeddings válidos (debe ser array de 1536 floats)'
  );
}

// Preparar array para insert en Supabase con validación de metadata
const insertData = chunks.map((chunk, index) => {
  // Validar y proporcionar metadata por defecto si falta
  const metadata =
    chunk.metadata && typeof chunk.metadata === 'object'
      ? chunk.metadata
      : { numero_chunk: index, warning: 'metadata_missing' };

  // Obtener chunk_index de manera segura
  const chunkIndex =
    typeof metadata.numero_chunk === 'number' ? metadata.numero_chunk : index;

  // Advertir si falta metadata
  if (!chunk.metadata || typeof chunk.metadata !== 'object') {
    console.warn(
      `⚠️ Chunk ${index} carece de metadata, usando valores por defecto`
    );
  }

  return {
    convenio_id: chunk.convenio_id,
    contenido: chunk.contenido,
    chunk_index: chunkIndex,
    metadata: metadata,
    // NUEVO: Incluir embedding
    embedding: chunk.embedding
  };
});

console.log(
  `✓ Preparados ${insertData.length} chunks para inserción en Supabase`
);
console.log(`  - Todos los chunks tienen embeddings de dimensión 1536`);
console.log(`  - Convenio ID: ${data.convenio_id}`);

return [
  {
    json: {
      chunks: insertData,
      total_chunks: insertData.length,
      embedding_usage: data.embedding_usage,
      convenio_id: data.convenio_id
    }
  }
];
