// ============================================
// NODO: Prepare Response
// WORKFLOW: Workrules Convenios - Indexer
// TIPO: Code (JavaScript) v2
// ============================================

// Obtener datos de los nodos anteriores
const convenioData = $('Save md in supabase1').first().json;
const markdownData = $('Extract and clean md1').first().json;
const chunksData = $('Merge Embeddings with Chunks').first().json;

// Construir response
return [{
  json: {
    status: 'success',
    message: 'Convenio procesado correctamente con embeddings',
    data: {
      convenio_id: convenioData.id,
      nombre: convenioData.nombre,
      codigo_regcon: convenioData.codigo_regcon,
      markdown_length: markdownData.longitud,
      pdf_url: convenioData.url_pdf,
      chunks_generados: chunksData.total_chunks,
      embeddings_generados: chunksData.total_chunks,
      embedding_usage: chunksData.embedding_usage || {}
    }
  }
}];
