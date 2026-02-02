// ============================================
// NODO: Extract Perfil JSON (Claude)
// FASE: I1.9
// FUNCIÓN: Enviar markdown del convenio a Claude para extraer perfil JSON estructurado
// ============================================

// ============================================
// CONFIGURACIÓN
// ============================================
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';
const MAX_OUTPUT_TOKENS = 8192;
const TEMPERATURE = 0;
const MAX_RETRIES = 2;

// ============================================
// SYSTEM PROMPT
// ============================================
const SYSTEM_PROMPT = `Eres un experto en derecho laboral espanol especializado en convenios colectivos.

Tu tarea es analizar el texto completo de un convenio colectivo y extraer un JSON estructurado con toda la informacion relevante para calcular condiciones laborales (salarios, jornada, complementos, etc.).

REGLAS ESTRICTAS:
1. Solo extrae datos que aparezcan EXPLICITAMENTE en el texto. Nunca inventes ni supongas valores.
2. Si un dato no aparece en el convenio, omite ese campo del JSON. No pongas null ni valores inventados.
3. Los salarios deben ser EXACTOS tal como aparecen en las tablas del convenio, sin redondear.
4. Cita el articulo del convenio donde aparece cada dato siempre que sea posible.
5. Si hay ambiguedad en un dato, incluyelo en el array "notas_extraccion" explicando la ambiguedad.
6. Responde UNICAMENTE con el JSON. Sin texto antes ni despues. Sin bloques de codigo markdown.
7. El JSON debe ser valido y parseable directamente.`;

// ============================================
// USER PROMPT TEMPLATE
// ============================================
function buildUserPrompt(markdown) {
  return `Analiza el siguiente convenio colectivo y extrae un JSON estructurado con esta informacion:

1. **Datos basicos**: nombre del convenio, ambito (estatal/autonomico/provincial/empresa), vigencia, codigo REGCON si aparece.

2. **Variables criticas**: lista de las variables que un usuario necesitaria proporcionar para obtener un calculo salarial preciso (ej: categoria profesional, grupo, nivel, tipo de jornada, antiguedad, categoria del establecimiento, zona geografica, etc.). Solo incluye variables que REALMENTE afecten al salario segun este convenio.

3. **Categorias profesionales**: TODAS las categorias/puestos que aparezcan en el convenio, con:
   - nombre exacto tal como aparece
   - grupo profesional (si existe clasificacion por grupos)
   - nivel (si existe)
   - area funcional (si existe)
   - salario base anual y/o mensual (de la tabla salarial mas reciente del convenio)

4. **Jornada laboral**: horas anuales, horas semanales, si hay distribucion irregular. Cita el articulo.

5. **Tablas salariales**: ano de referencia de los salarios, numero de pagas (incluyendo extras), criterio de revision salarial (IPC, porcentaje fijo, etc.).

6. **Complementos salariales**: TODOS los complementos/pluses definidos en el convenio:
   - nombre del complemento
   - tipo: "porcentaje", "cantidad_fija", "trienio", "quinquenio", "bienio" u "otro"
   - valor numerico (porcentaje o euros)
   - base de calculo (sobre que se aplica)
   - condicion para aplicarlo (si la hay)
   - articulo del convenio

7. **Horas extraordinarias**: recargo en laborables (%), recargo en festivos (%), precio fijo si lo hay, maximo anual, si se pueden compensar con descanso. Cita articulo.

8. **Periodo de prueba**: duracion por tipo de trabajador/categoria. Cita articulo.

9. **Vacaciones**: dias naturales o laborables. Cita articulo.

10. **Variables especificas del sector**: cualquier variable propia de este convenio que no encaje en los campos anteriores (ej: "Categoria Hotel" con valores ["3 estrellas", "4 estrellas", "5 estrellas"], "Zona geografica" con valores posibles, etc.). Incluye los valores posibles como array de strings.

11. **Notas de extraccion**: lista cualquier ambiguedad, dato que no pudiste extraer con certeza, o informacion relevante que no encaje en los campos anteriores.

FORMATO DE SALIDA - JSON con esta estructura:
{
  "convenio": "string",
  "ambito": "estatal|autonomico|provincial|empresa",
  "vigencia": { "inicio": "YYYY", "fin": "YYYY", "prorroga_automatica": true|false },
  "codigo_convenio": "string",
  "variables_criticas": ["string"],
  "categorias_profesionales": [
    { "nombre": "string", "grupo": "string", "nivel": "string", "area_funcional": "string", "salario_base_anual": number, "salario_base_mensual": number }
  ],
  "jornada": { "horas_anuales": number, "horas_semanales": number, "distribucion_irregular": boolean, "articulo": "string" },
  "tablas_salariales": { "ano_referencia": "YYYY", "num_pagas": number, "pagas_extra": number, "revision_salarial": "string" },
  "complementos": [
    { "nombre": "string", "tipo": "porcentaje|cantidad_fija|trienio|quinquenio|bienio|otro", "valor": number, "base_calculo": "string", "condicion": "string", "articulo": "string" }
  ],
  "horas_extra": { "recargo_laborable_pct": number, "recargo_festivo_pct": number, "precio_fijo_hora": number, "maximo_anual": number, "compensacion_descanso": boolean, "articulo": "string" },
  "periodo_prueba": [
    { "tipo_trabajador": "string", "duracion": "string", "articulo": "string" }
  ],
  "vacaciones": { "dias_naturales": number, "dias_laborables": number, "articulo": "string" },
  "variables_especificas": { "nombre_variable": ["valor1", "valor2"] },
  "notas_extraccion": ["string"]
}

Omite los campos para los que no encuentres informacion en el texto. No inventes datos.

---

TEXTO DEL CONVENIO:

${markdown}`;
}

// ============================================
// FUNCIÓN DE RETRY
// ============================================
async function callClaudeWithRetry(
  systemPrompt,
  userPrompt,
  apiKey,
  maxRetries = MAX_RETRIES
) {
  const payload = {
    model: MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    temperature: TEMPERATURE,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 seconds timeout

    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Rate limit
      if (response.status === 429) {
        if (attempt === maxRetries) {
          const errorText = await response
            .text()
            .catch(() => 'No response body');
          throw new Error(
            `Rate limited after ${maxRetries} attempts. Response: ${errorText}`
          );
        }
        const waitTime = Math.pow(2, attempt) * 2000;
        console.log(
          `Rate limited. Waiting ${waitTime}ms before retry ${attempt}/${maxRetries}...`
        );
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }

      // Overloaded
      if (response.status === 529) {
        if (attempt === maxRetries) {
          throw new Error(
            `Anthropic API overloaded after ${maxRetries} attempts`
          );
        }
        const waitTime = Math.pow(2, attempt) * 3000;
        console.log(
          `API overloaded. Waiting ${waitTime}ms before retry ${attempt}/${maxRetries}...`
        );
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Anthropic API error ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort specifically
      if (error.name === 'AbortError') {
        console.log(
          `Request aborted due to timeout (attempt ${attempt}/${maxRetries})`
        );
        if (attempt === maxRetries) {
          throw new Error('Request timed out after 120 seconds');
        }
        const waitTime = Math.pow(2, attempt) * 2000;
        console.log(`Retrying in ${waitTime}ms...`);
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }

      if (attempt === maxRetries) {
        throw new Error(
          `Failed after ${maxRetries} attempts: ${error.message}`
        );
      }
      const waitTime = Math.pow(2, attempt) * 2000;
      console.log(
        `Attempt ${attempt} failed: ${error.message}. Retrying in ${waitTime}ms...`
      );
      await new Promise(r => setTimeout(r, waitTime));
    }
  }

  throw new Error(
    `Failed to get response from Claude after ${maxRetries} attempts`
  );
}

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================

// Obtener markdown del convenio del nodo anterior
const markdownData = $('Extract and clean md1').first().json;
const markdown = markdownData.markdown_completo;
const convenioId = markdownData.convenio_id;
const convenioNombre = markdownData.nombre;

if (!markdown || markdown.trim().length === 0) {
  throw new Error('No hay markdown del convenio para extraer perfil');
}

console.log(
  `Extrayendo perfil JSON de convenio: ${convenioNombre || convenioId}`
);
console.log(`Longitud del markdown: ${markdown.length} caracteres`);

// Obtener API Key de las credenciales de Anthropic
let apiKey;
try {
  apiKey = $credentials.anthropicApi.apiKey;
} catch (error) {
  throw new Error(
    'No se pudo obtener la API Key de Anthropic. Verifica que la credencial "Anthropic account" esté configurada.'
  );
}

// Construir prompt y llamar a Claude
const userPrompt = buildUserPrompt(markdown);
const startTime = Date.now();

const result = await callClaudeWithRetry(SYSTEM_PROMPT, userPrompt, apiKey);

const elapsedMs = Date.now() - startTime;

// Extraer texto de la respuesta
const responseText = result.content?.[0]?.text;
if (!responseText) {
  throw new Error('Claude no devolvió contenido en la respuesta');
}

// Estadísticas de uso
const usage = {
  input_tokens: result.usage?.input_tokens || 0,
  output_tokens: result.usage?.output_tokens || 0,
  model: result.model || MODEL,
  elapsed_ms: elapsedMs,
  estimated_cost_usd:
    ((result.usage?.input_tokens || 0) / 1000000) * 3 +
    ((result.usage?.output_tokens || 0) / 1000000) * 15
};

console.log(`✓ Respuesta recibida de Claude:`);
console.log(`  - Input tokens: ${usage.input_tokens}`);
console.log(`  - Output tokens: ${usage.output_tokens}`);
console.log(`  - Tiempo: ${(usage.elapsed_ms / 1000).toFixed(1)}s`);
console.log(`  - Coste estimado: $${usage.estimated_cost_usd.toFixed(4)}`);

return [
  {
    json: {
      raw_response: responseText,
      convenio_id: convenioId,
      convenio_nombre: convenioNombre,
      claude_usage: usage
    }
  }
];
