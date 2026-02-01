// ============================================
// NODO: Prepare Chunks for Insert
// WORKFLOW: Workrules Convenios - Indexer
// TIPO: Code (JavaScript) v2
// ============================================

// Obtener todos los chunks generados
const chunks = $input.all();

// Preparar array para pasar al siguiente nodo (Generate Embeddings)
const allChunks = chunks.map(item => ({
  convenio_id: item.json.convenio_id,
  contenido: item.json.contenido,
  metadata: item.json.metadata
}));

// Obtener stats del primer chunk (si existe)
const stats = chunks[0]?.json?.chunking_stats || {
  total_chunks: chunks.length,
  avg_tokens: 0,
  min_tokens: 0,
  max_tokens: 0
};

return [{
  json: {
    chunks: allChunks,
    total_chunks: allChunks.length,
    stats: stats,
    convenio_id: chunks[0]?.json?.convenio_id
  }
}];
