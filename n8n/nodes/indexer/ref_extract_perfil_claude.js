// ============================================
// NODO: Extract Perfil Claude
// FASE: I1.9
// FUNCIÓN: Procesar la respuesta de HTTP Claude API y extraer el JSON del perfil
// ============================================
// NOTA: Este nodo NO llama a Claude directamente.
// La llamada a Claude se hace en el nodo anterior "HTTP Claude API".
// Este nodo solo extrae y formatea la respuesta.
// ============================================

// Obtener la respuesta del nodo HTTP Claude API
const httpResponse = $input.first().json;

// Verificar que tenemos respuesta
if (!httpResponse) {
  throw new Error('No se recibió respuesta del nodo HTTP Claude API');
}

// Extraer el texto de la respuesta de Claude
// La estructura de respuesta de Anthropic es: { content: [{ type: "text", text: "..." }], usage: {...} }
const responseText = httpResponse.content?.[0]?.text;

if (!responseText) {
  // Log para debug
  console.log(
    'Estructura de respuesta recibida:',
    JSON.stringify(httpResponse, null, 2).substring(0, 500)
  );
  throw new Error(
    'Claude no devolvió contenido en la respuesta. Verifica el nodo HTTP Claude API.'
  );
}

// Obtener datos del convenio del nodo Extract and clean md
// NOTA: Ajusta el nombre del nodo si es diferente en tu workflow
let convenioId = null;
let convenioNombre = null;

try {
  const markdownData = $('Extract and clean md1').first().json;
  convenioId = markdownData.convenio_id;
  convenioNombre = markdownData.nombre;
} catch (error) {
  // Intentar con nombre alternativo del nodo
  console.log('⚠ Intento 1 fallido:', error.message);
  try {
    const markdownData = $('Extract and clean md').first().json;
    convenioId = markdownData.convenio_id;
    convenioNombre = markdownData.nombre;
  } catch (error2) {
    console.log(
      '⚠ No se pudo obtener datos del nodo Extract and clean md:',
      error2.message,
      'Continuando sin ellos.'
    );
  }
}

// Estadísticas de uso de Claude
const usage = {
  input_tokens: httpResponse.usage?.input_tokens || 0,
  output_tokens: httpResponse.usage?.output_tokens || 0,
  model: httpResponse.model || 'unknown',
  stop_reason: httpResponse.stop_reason || null
};

// Calcular costo estimado usando las tarifas del modelo reportado por la API.
// Fallback a tarifas de Sonnet si el modelo no está mapeado.
const ratesByModel = {
  'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
  'claude-3-7-sonnet-20250219': { input: 3, output: 15 },
  'claude-sonnet-4-20250514': { input: 3, output: 15 },
  'claude-3-5-haiku-20241022': { input: 0.8, output: 4 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  'claude-opus-4-20250514': { input: 15, output: 75 },
  'claude-3-opus-20240229': { input: 15, output: 75 }
};

const defaultRates = { input: 3, output: 15 };
const { input: inputRate, output: outputRate } =
  ratesByModel[usage.model] || defaultRates;

const estimatedCostUsd =
  (usage.input_tokens / 1_000_000) * inputRate +
  (usage.output_tokens / 1_000_000) * outputRate;

console.log(`✓ Respuesta de Claude procesada:`);
console.log(`  - Convenio: ${convenioNombre || convenioId || 'desconocido'}`);
console.log(`  - Input tokens: ${usage.input_tokens}`);
console.log(`  - Output tokens: ${usage.output_tokens}`);
console.log(
  `  - Modelo: ${usage.model} (input: $${inputRate}/M, output: $${outputRate}/M)`
);
console.log(`  - Costo estimado: $${estimatedCostUsd.toFixed(4)}`);
console.log(`  - Longitud respuesta: ${responseText.length} caracteres`);
console.log(`  - Stop reason: ${usage.stop_reason}`);

if (usage.stop_reason === 'max_tokens') {
  throw new Error(
    `Claude cortó la respuesta por max_tokens (output_tokens=${usage.output_tokens}). ` +
      `El JSON está truncado. Sube MAX_OUTPUT_TOKENS en 'Prepare Claude Request' o ` +
      `divide la extracción en varias llamadas. Convenio: ${convenioNombre || convenioId}.`
  );
}

return [
  {
    json: {
      raw_response: responseText,
      convenio_id: convenioId,
      convenio_nombre: convenioNombre,
      claude_usage: {
        ...usage,
        estimated_cost_usd: estimatedCostUsd
      }
    }
  }
];
