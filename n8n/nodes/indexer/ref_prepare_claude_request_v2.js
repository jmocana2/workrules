// ============================================
// NODO: Prepare Claude Request (v2 - Perfil Enriquecido)
// FASE: I1.9
// FUNCIÓN: Preparar payload para llamada a Claude API
// ============================================
// CAMBIOS v2:
// - Extraer TODAS las categorías profesionales (no solo principales)
// - Añadir sinónimos de categorías
// - Añadir salarios por tipo de establecimiento
// - Añadir mapeo de establecimientos a clases
// ============================================

const MODEL = 'claude-sonnet-4-20250514';
const MAX_OUTPUT_TOKENS = 16384;
const TEMPERATURE = 0;

const SYSTEM_PROMPT = `Eres un experto en derecho laboral espanol especializado en convenios colectivos.

Tu tarea es analizar el texto completo de un convenio colectivo y extraer un JSON estructurado con TODA la informacion relevante para calcular condiciones laborales (salarios, jornada, complementos, etc.).

REGLAS ESTRICTAS:
1. Solo extrae datos que aparezcan EXPLICITAMENTE en el texto. Nunca inventes ni supongas valores.
2. Si un dato no aparece en el convenio, omite ese campo del JSON. No pongas null ni valores inventados.
3. Los salarios deben ser EXACTOS tal como aparecen en las tablas del convenio, sin redondear.
4. Cita el articulo del convenio donde aparece cada dato siempre que sea posible.
5. Si hay ambiguedad en un dato, incluyelo en el array "notas_extraccion" explicando la ambiguedad.
6. Responde UNICAMENTE con el JSON. Sin texto antes ni despues. Sin bloques de codigo markdown.
7. El JSON debe ser valido y parseable directamente.
8. IMPORTANTE: Extrae TODAS las categorias profesionales que aparezcan en las tablas salariales, no solo las principales.
9. SINONIMOS OBLIGATORIOS: Para cada categoria profesional, DEBES incluir:
   - Variaciones de genero del nombre principal (masculino/femenino)
   - TODOS los sinonimos que el convenio liste entre parentesis
   - Variaciones de genero de terminos cortos (1-2 palabras) en los sinonimos
   - Sé conservador: NO generes todas las combinaciones posibles, solo las mas relevantes
   - Ejemplo: "Gobernanta" → ["Gobernante"]; "Auxiliar (o Ayudante, Mozo/a)" → ["Ayudante", "Mozo", "Moza"]`;

function buildUserPrompt(markdown) {
  return `Analiza el siguiente convenio colectivo y extrae un JSON estructurado con esta informacion:

1. **Datos basicos**: nombre del convenio, ambito (estatal/autonomico/provincial/empresa), vigencia, codigo REGCON si aparece.

2. **Variables criticas**: lista de variables que un usuario necesitaria para un calculo salarial preciso. Solo incluye variables que REALMENTE afecten al salario segun este convenio.

3. **Categorias profesionales**: Extrae TODAS las categorias/puestos que aparezcan en las tablas salariales y clasificacion profesional del convenio. NO solo las principales, TODAS. Para cada una incluye:
   - nombre: nombre exacto tal como aparece en el convenio
   - sinonimos: array de nombres alternativos. DEBES incluir:
     * Variaciones de género del NOMBRE PRINCIPAL: Si el convenio lista "Auxiliar de Limpieza", incluye "Auxiliares de Limpieza" en sinonimos
     * TODOS los sinónimos que el convenio liste entre paréntesis: Si dice "Auxiliar de Limpieza (o Personal de Limpieza, Fregador/a, Limpiador/a)", incluye TODOS esos terminos en el array
     * Variaciones de género de términos cortos en los sinónimos: Si un sinónimo es "Fregador/a", incluye "Fregador" y "Fregadora"
     * NO generes todas las combinaciones posibles de género/número de TODOS los sinónimos (solo los más relevantes)
     * Ejemplo: "Auxiliar de Limpieza (o Personal de Limpieza, Fregador/a, Limpiador/a)" → sinonimos: ["Auxiliares de Limpieza", "Personal de Limpieza", "Fregador", "Fregadora", "Limpiador", "Limpiadora"]
   - grupo: grupo profesional si existe
   - nivel: OBLIGATORIO - nivel retributivo (I, II-A, II-B, II-C, III, III-A, III-B, IV, V, etc.)
   - area_funcional: area funcional si el convenio la define (Cocina, Sala, Recepcion, Administracion, etc.)
   - salarios: objeto con salario base MENSUAL por tipo/clase de establecimiento. Las claves son los tipos del convenio (A, B, C, D, Lujo, Primera, Segunda, Tercera, Cuarta) y los valores son los importes en euros. Ejemplo: {"A": 1283.83, "B": 1250.91, "C": 1160.37, "D": 1277.36}
   - salario_base_mensual: solo si el convenio NO distingue por tipo de establecimiento

4. **Mapeo de establecimientos**: Crea un objeto que mapee tipos de establecimiento comunes a las clases salariales del convenio. Busca en el convenio la clasificacion de establecimientos y crea el mapeo. Ejemplo:
   {
     "hotel 5 estrellas": "A",
     "hotel 4 estrellas": "A",
     "hotel 3 estrellas": "B",
     "hotel 2 estrellas": "C",
     "restaurante 5 tenedores": "A",
     "restaurante 4 tenedores": "A",
     "restaurante 3 tenedores": "B",
     "restaurante 2 tenedores": "C",
     "restaurante 1 tenedor": "C",
     "cafeteria 3 tazas": "A",
     "cafeteria 2 tazas": "B",
     "cafeteria 1 taza": "C",
     "bar": "C",
     "taberna": "C",
     "whisqueria": "B",
     "bar americano": "B",
     "discoteca": "A",
     "sala de fiestas": "A",
     "catering": "D"
   }
   Incluye TODOS los tipos que mencione el convenio.

5. **Jornada laboral**: horas anuales, semanales, si hay distribucion irregular. Cita articulo.

6. **Tablas salariales**: ano referencia, num pagas, pagas extra, revision salarial.

7. **Complementos salariales**: TODOS con nombre, tipo, valor, base calculo, condicion, excepcion (tipos de establecimiento donde NO aplica), articulo.

8. **Horas extraordinarias**: recargos, precio fijo, maximo anual, compensacion descanso. Cita articulo.

9. **Periodo de prueba**: duracion por tipo de trabajador. Cita articulo.

10. **Vacaciones**: dias naturales o laborables. Cita articulo.

11. **Variables especificas del sector**: cualquier variable propia con valores posibles como array.

12. **Notas de extraccion**: ambiguedades, datos no extraidos con certeza.

FORMATO DE SALIDA - JSON con esta estructura:
{
  "convenio": "string",
  "ambito": "estatal|autonomico|provincial|empresa",
  "vigencia": { "inicio": "YYYY", "fin": "YYYY", "prorroga_automatica": true|false },
  "codigo_convenio": "string",
  "variables_criticas": ["string"],
  "categorias_profesionales": [
    {
      "nombre": "string (nombre exacto del convenio)",
      "sinonimos": ["variacion genero", "variacion singular/plural", "denominacion alternativa"],
      "grupo": "string",
      "nivel": "string (OBLIGATORIO)",
      "area_funcional": "string",
      "salarios": { "A": number, "B": number, "C": number, "D": number }
    }
  ],
  "mapeo_establecimientos": {
    "hotel 5 estrellas": "A",
    "hotel 4 estrellas": "A",
    "whisqueria": "B"
  },
  "jornada": { "horas_anuales": number, "horas_semanales": number, "distribucion_irregular": boolean, "articulo": "string" },
  "tablas_salariales": { "ano_referencia": "YYYY", "num_pagas": number, "pagas_extra": number, "revision_salarial": "string" },
  "complementos": [
    { "nombre": "string", "tipo": "porcentaje|cantidad_fija|trienio|quinquenio|bienio|otro", "valor": number, "base_calculo": "string", "condicion": "string", "excepcion": "string", "articulo": "string" }
  ],
  "horas_extra": { "recargo_laborable_pct": number, "recargo_festivo_pct": number, "precio_fijo_hora": number, "maximo_anual": number, "compensacion_descanso": boolean, "articulo": "string" },
  "periodo_prueba": [
    { "tipo_trabajador": "string", "duracion": "string", "articulo": "string" }
  ],
  "vacaciones": { "dias_naturales": number, "dias_laborables": number, "articulo": "string" },
  "variables_especificas": { "nombre_variable": ["valor1", "valor2"] },
  "notas_extraccion": ["string"]
}

EJEMPLOS CONCRETOS DE CATEGORIAS PROFESIONALES:

Ejemplo 1 - Categoria simple:
Convenio: "Gobernanta"
Extraccion:
{
  "nombre": "Gobernanta",
  "sinonimos": ["Gobernante"],
  "nivel": "IV",
  "salarios": { "A": 1400.00 }
}

Ejemplo 2 - Categoria con sinonimos del convenio:
Convenio: "Auxiliar de Limpieza (o Personal de Limpieza, Fregador/a, Limpiador/a, Mozo de Lavanderia)"
Extraccion:
{
  "nombre": "Auxiliar de Limpieza",
  "sinonimos": [
    "Auxiliares de Limpieza",
    "Personal de Limpieza",
    "Fregador",
    "Fregadora",
    "Limpiador",
    "Limpiadora",
    "Mozo de Lavanderia",
    "Moza de Lavanderia"
  ],
  "nivel": "V",
  "salarios": { "A": 1150.00 }
}

Ejemplo 3 - Categoria con muchos sinonimos (ser selectivo):
Convenio: "Camarero/a (o Dependiente de Cafeteria, Dependiente de 1a, Planchista, Cafetero/a)"
Extraccion:
{
  "nombre": "Camarero/a",
  "sinonimos": [
    "Camarero",
    "Camarera",
    "Dependiente de Cafeteria",
    "Dependiente de 1a",
    "Planchista",
    "Cafetero",
    "Cafetera"
  ],
  "nivel": "III",
  "salarios": { "A": 1283.83 }
}

IMPORTANTE: Extrae TODOS los sinonimos que el convenio mencione. Genera variaciones de genero solo de terminos cortos y relevantes. Se conservador para evitar explotar el array.

Omite campos sin informacion. No inventes datos.

---

TEXTO DEL CONVENIO:

${markdown}`;
}

// MAIN
const upstreamItem = $('Extract and clean md1').first();

if (
  !upstreamItem ||
  !upstreamItem.json ||
  typeof upstreamItem.json !== 'object' ||
  !('markdown_completo' in upstreamItem.json) ||
  !('convenio_id' in upstreamItem.json) ||
  !('nombre' in upstreamItem.json)
) {
  throw new Error(
    "Upstream node 'Extract and clean md1' returned no data or is missing required fields: markdown_completo, convenio_id, nombre"
  );
}

const markdownData = upstreamItem.json;
const markdown = markdownData.markdown_completo;
const convenioId = markdownData.convenio_id;
const convenioNombre = markdownData.nombre;

if (!markdown || markdown.trim().length === 0) {
  throw new Error('No hay markdown del convenio para extraer perfil');
}

console.log(
  `Preparando request para Claude: ${convenioNombre || convenioId} (${markdown.length} chars)`
);

const userPrompt = buildUserPrompt(markdown);
const requestStartTime = Date.now();

// Preparar payload para el nodo HTTP
const payload = {
  model: MODEL,
  max_tokens: MAX_OUTPUT_TOKENS,
  temperature: TEMPERATURE,
  system: SYSTEM_PROMPT,
  messages: [{ role: 'user', content: userPrompt }]
};

return [
  {
    json: {
      payload: payload,
      convenio_id: convenioId,
      convenio_nombre: convenioNombre,
      request_start_time: requestStartTime
    }
  }
];
