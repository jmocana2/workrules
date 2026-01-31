// ============================================
// NODO: Prepare Chunks for Insert (ACTUALIZADO I1.8)
// FUNCIÓN: Preparar chunks con embeddings para insert en Supabase
// ============================================

// Obtener todos los chunks con embeddings del nodo anterior
const data = $input.first().json;
const chunks = data.chunks;

// Validar que tenemos chunks
if (!chunks || chunks.length === 0) {
  throw new Error('No hay chunks para preparar');
}

// Validar que los chunks tienen embeddings
const hasEmbeddings = chunks.every(chunk =>
  chunk.embedding && Array.isArray(chunk.embedding) && chunk.embedding.length === 1536
);

if (!hasEmbeddings) {
  throw new Error('Algunos chunks no tienen embeddings válidos (debe ser array de 1536 floats)');
}

// Preparar array para insert en Supabase
const insertData = chunks.map(chunk => ({
  convenio_id: chunk.convenio_id,
  contenido: chunk.contenido,
  chunk_index: chunk.metadata.numero_chunk,
  metadata: chunk.metadata,
  // NUEVO: Incluir embedding
  embedding: chunk.embedding
}));

console.log(`✓ Preparados ${insertData.length} chunks para inserción en Supabase`);
console.log(`  - Todos los chunks tienen embeddings de dimensión 1536`);
console.log(`  - Convenio ID: ${data.convenio_id}`);

return [{
  json: {
    chunks: insertData,
    total_chunks: insertData.length,
    embedding_usage: data.embedding_usage,
    convenio_id: data.convenio_id
  }
}];
