// ============================================
// NODO: Generate Embeddings
// FASE: I1.8
// FUNCIÓN: Generar embeddings usando OpenAI API para chunks de convenio
// ============================================

// ============================================
// CONFIGURACIÓN
// ============================================
const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings';
const MODEL = 'text-embedding-3-small';
const BATCH_SIZE = 100; // OpenAI permite hasta 2048, pero 100 es seguro
const MAX_RETRIES = 3;

// ============================================
// FUNCIÓN DE RETRY CON EXPONENTIAL BACKOFF
// ============================================
async function callOpenAIWithRetry(payload, apiKey, maxRetries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      // Manejar rate limit con retry
      if (response.status === 429) {
        const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
        console.log(`Rate limited. Waiting ${waitTime}ms before retry ${attempt}/${maxRetries}...`);
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }

      // Otros errores HTTP
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      // Si es el último intento, lanzar error
      if (attempt === maxRetries) {
        throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
      }

      // Esperar antes de reintentar
      const waitTime = Math.pow(2, attempt) * 1000;
      console.log(`Attempt ${attempt} failed. Retrying in ${waitTime}ms...`);
      await new Promise(r => setTimeout(r, waitTime));
    }
  }
}

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================

// Obtener datos del input
const inputData = $input.first().json;
const chunks = inputData.chunks;

// Validar que hay chunks
if (!chunks || chunks.length === 0) {
  throw new Error('No hay chunks para generar embeddings');
}

// Obtener API Key de las credenciales
let apiKey;
try {
  // Intentar obtener de credenciales de OpenAI
  apiKey = $credentials.openAiApi.apiKey;
} catch (error) {
  throw new Error('No se pudo obtener la API Key de OpenAI. Verifica que las credenciales estén configuradas.');
}

// Preparar textos para embedding
const textos = chunks.map(c => c.contenido);

// Log inicial
console.log(`Generando embeddings para ${chunks.length} chunks usando modelo ${MODEL}...`);

// Preparar payload
const payload = {
  input: textos,
  model: MODEL,
  encoding_format: 'float'
};

// Hacer request a OpenAI con retry logic
const result = await callOpenAIWithRetry(payload, apiKey);

// Validar respuesta
if (!result.data || result.data.length !== chunks.length) {
  throw new Error(
    `Mismatch en embeddings: ${chunks.length} chunks pero ${result.data?.length || 0} embeddings recibidos`
  );
}

// Combinar chunks con sus embeddings
const chunksWithEmbeddings = chunks.map((chunk, index) => ({
  ...chunk,
  embedding: result.data[index].embedding
}));

// Validar que los embeddings tienen la dimensión correcta (1536 para text-embedding-3-small)
const firstEmbedding = chunksWithEmbeddings[0].embedding;
if (!firstEmbedding || firstEmbedding.length !== 1536) {
  throw new Error(
    `Embedding dimension incorrecta: esperado 1536, recibido ${firstEmbedding?.length || 0}`
  );
}

// Estadísticas de uso
const usage = {
  total_tokens: result.usage.total_tokens,
  prompt_tokens: result.usage.prompt_tokens,
  chunks_processed: chunks.length,
  model: MODEL,
  estimated_cost_usd: (result.usage.total_tokens / 1000000) * 0.02 // $0.02 por 1M tokens
};

console.log(`✓ Embeddings generados exitosamente:`);
console.log(`  - Chunks procesados: ${usage.chunks_processed}`);
console.log(`  - Tokens consumidos: ${usage.total_tokens}`);
console.log(`  - Coste estimado: $${usage.estimated_cost_usd.toFixed(6)}`);

// Retornar datos con embeddings
return [{
  json: {
    chunks: chunksWithEmbeddings,
    total_chunks: chunksWithEmbeddings.length,
    embedding_usage: usage,
    convenio_id: chunks[0]?.convenio_id
  }
}];
