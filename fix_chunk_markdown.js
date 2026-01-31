// ============================================
// EJECUCIÓN PRINCIPAL
// ============================================

// Obtener datos del convenio guardado (viene del nodo anterior)
const inputData = $input.first().json;

// La respuesta de Supabase es un array con el convenio insertado
const convenioData = Array.isArray(inputData) ? inputData[0] : inputData;

if (!convenioData || !convenioData.id) {
  throw new Error(
    'No se pudo obtener el ID del convenio guardado. Data: ' +
      JSON.stringify(inputData)
  );
}

const convenioId = convenioData.id; // UUID real del convenio
const convenioNombre = convenioData.nombre;
const markdown = convenioData.markdown_completo || '';

// Validar input
if (!markdown || markdown.length < 100) {
  throw new Error(
    'Markdown vacío o muy corto para procesar. Longitud: ' + markdown.length
  );
}

// Ejecutar chunking
const chunks = chunkMarkdown(markdown, convenioId, convenioNombre);
