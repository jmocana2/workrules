// ============================================
// NODO: Extract and clean md
// WORKFLOW: Workrules Convenios - Indexer
// TIPO: Code (JavaScript) v2
// ============================================

// Obtener la respuesta de LlamaParse
const llamaParseResult = $input.first().json;

// Extraer el markdown
const markdown = llamaParseResult.markdown ||
                 llamaParseResult.text;

// Validar que tenemos contenido
if (!markdown || markdown.trim().length === 0) {
  throw new Error('No se pudo extraer el markdown de LlamaParse. Respuesta vacía.');
}

// Limpiar y normalizar el markdown
const cleanMarkdown = markdown
  .replace(/\n{3,}/g, '\n\n')      // Normalizar múltiples saltos
  .replace(/\r\n/g, '\n')          // Normalizar line endings
  .trim();

// Obtener datos del webhook (están dentro de body)
const webhookData = $('Webhook').first().json.body;

// Retornar datos estructurados
return {
  json: {
    markdown_completo: cleanMarkdown,
    longitud: cleanMarkdown.length,
    convenio_id: webhookData.codigo_regcon,
    nombre: webhookData.nombre,
    // Campos opcionales (pueden no venir en el payload)
    ambito: webhookData.ambito || null,
    fecha_vigencia: webhookData.fecha_vigencia || null
  }
};
