// ============================================
// NODO: Validate Perfil JSON
// FASE: I1.9
// FUNCIÓN: Parsear y validar el JSON devuelto por Claude antes de insertar en DB
// ============================================

// ============================================
// CAMPOS OBLIGATORIOS DEL SCHEMA
// ============================================
const REQUIRED_FIELDS = [
  'convenio',
  'ambito',
  'variables_criticas',
  'categorias_profesionales',
  'jornada'
];
const VALID_AMBITOS = ['estatal', 'autonomico', 'provincial', 'empresa'];
const VALID_COMPLEMENTO_TIPOS = [
  'porcentaje',
  'cantidad_fija',
  'trienio',
  'quinquenio',
  'bienio',
  'otro'
];

// ============================================
// FUNCIONES DE VALIDACIÓN
// ============================================

function cleanJsonResponse(text) {
  let cleaned = text.trim();

  // Quitar bloques de código markdown si Claude los añadió
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }

  return sanitizeControlChars(cleaned.trim());
}

// Claude a veces devuelve saltos de línea, tabuladores y otros caracteres de
// control literales DENTRO de strings del JSON (típico en 'articulo',
// 'condicion', 'notas_extraccion'). JSON estricto no los admite y JSON.parse
// falla con "Bad control character in string literal". Los reemplazamos por su
// forma escapada — sólo cuando estamos dentro de un string (tracking de "
// balanceadas, respetando el escape \\ previo).
const CONTROL_ESCAPES = {
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
  '\b': '\\b',
  '\f': '\\f',
};

function escapeControlChar(ch) {
  if (CONTROL_ESCAPES[ch]) return CONTROL_ESCAPES[ch];
  return '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0');
}

function sanitizeControlChars(text) {
  let out = '';
  let inString = false;
  let escapeNext = false;
  for (const ch of text) {
    if (escapeNext) {
      out += ch;
      escapeNext = false;
      continue;
    }
    if (ch === '\\') {
      out += ch;
      escapeNext = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      out += ch;
      continue;
    }
    if (inString && ch.charCodeAt(0) < 0x20) {
      out += escapeControlChar(ch);
      continue;
    }
    out += ch;
  }
  return out;
}

function validateCategoria(cat, index) {
  const warnings = [];

  if (!cat.nombre || typeof cat.nombre !== 'string') {
    warnings.push(
      `categorias_profesionales[${index}]: falta "nombre" o no es string`
    );
  }

  if (
    cat.salario_base_anual !== undefined &&
    typeof cat.salario_base_anual !== 'number'
  ) {
    warnings.push(
      `categorias_profesionales[${index}].salario_base_anual no es number`
    );
  }

  if (
    cat.salario_base_mensual !== undefined &&
    typeof cat.salario_base_mensual !== 'number'
  ) {
    warnings.push(
      `categorias_profesionales[${index}].salario_base_mensual no es number`
    );
  }

  // Redondear salarios a 2 decimales
  if (typeof cat.salario_base_anual === 'number') {
    cat.salario_base_anual = Math.round(cat.salario_base_anual * 100) / 100;
  }
  if (typeof cat.salario_base_mensual === 'number') {
    cat.salario_base_mensual = Math.round(cat.salario_base_mensual * 100) / 100;
  }

  return warnings;
}

function validateComplemento(comp, index) {
  const warnings = [];

  if (!comp.nombre || typeof comp.nombre !== 'string') {
    warnings.push(`complementos[${index}]: falta "nombre"`);
  }

  if (!comp.tipo) {
    warnings.push(`complementos[${index}]: falta "tipo"`);
  } else if (!VALID_COMPLEMENTO_TIPOS.includes(comp.tipo)) {
    warnings.push(
      `complementos[${index}].tipo "${comp.tipo}" no es válido, se cambia a "otro"`
    );
    comp.tipo = 'otro';
  }

  if (comp.valor !== undefined && typeof comp.valor !== 'number') {
    warnings.push(`complementos[${index}].valor no es number`);
  }

  return warnings;
}

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================

const inputData = $input.first().json;
const rawResponse = inputData.raw_response;
const convenioId = inputData.convenio_id;
const convenioNombre = inputData.convenio_nombre;
const claudeUsage = inputData.claude_usage;

if (!rawResponse) {
  throw new Error('No hay respuesta de Claude para validar');
}

// 1. Limpiar y parsear JSON
const cleanedJson = cleanJsonResponse(rawResponse);
let perfil;

try {
  perfil = JSON.parse(cleanedJson);
} catch (parseError) {
  // Intentar extraer JSON usando brace-matching
  console.log(`Initial JSON parse failed: ${parseError.message}. Attempting brace-matching extraction...`);
  const firstBrace = cleanedJson.indexOf('{');

  if (firstBrace !== -1) {
    // Implementar brace-matching para extraer el primer objeto JSON válido
    let braceCount = 0;
    let endIndex = -1;
    let inString = false;
    let escapeNext = false;

    for (let i = firstBrace; i < cleanedJson.length; i++) {
      const char = cleanedJson[i];

      // Manejar escape characters
      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      // Manejar strings (ignorar braces dentro de strings)
      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      // Contar braces fuera de strings
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          endIndex = i + 1;
          break;
        }
      }
    }

    if (endIndex !== -1) {
      const extractedJson = cleanedJson.substring(firstBrace, endIndex);
      try {
        perfil = JSON.parse(extractedJson);
        console.log('⚠ JSON extraído usando brace-matching');
      } catch (e) {
        // Debug log con contenido sanitizado (solo para diagnóstico)
        const sanitizedPreview = cleanedJson
          .substring(0, 100)
          .replace(/[^\x20-\x7E]/g, '?');
        console.log(
          `Debug: Parse error after brace-matching. Error: ${e.message}. Preview: ${sanitizedPreview}...`
        );
        throw new Error(`Invalid JSON from Claude: ${e.message}`);
      }
    } else {
      // Debug log con contenido sanitizado
      const sanitizedPreview = cleanedJson
        .substring(0, 100)
        .replace(/[^\x20-\x7E]/g, '?');
      console.log(
        `Debug: No matching closing brace found. Preview: ${sanitizedPreview}...`
      );
      throw new Error('No valid JSON found in Claude response');
    }
  } else {
    // Debug log con contenido sanitizado
    const sanitizedPreview = cleanedJson
      .substring(0, 100)
      .replace(/[^\x20-\x7E]/g, '?');
    console.log(
      `Debug: No opening brace found. Preview: ${sanitizedPreview}...`
    );
    throw new Error('No valid JSON found in Claude response');
  }
}

console.log('✓ JSON parseado correctamente');

// 2. Validar campos obligatorios
const missingFields = REQUIRED_FIELDS.filter(field => !perfil[field]);
if (missingFields.length > 0) {
  console.log(`⚠ Campos obligatorios faltantes: ${missingFields.join(', ')}`);
  // No lanzar error: guardamos lo que hay pero lo marcamos
}

// 3. Validar ambito
if (perfil.ambito && !VALID_AMBITOS.includes(perfil.ambito)) {
  console.log(
    `⚠ Ámbito "${perfil.ambito}" no reconocido, se mantiene tal cual`
  );
}

// 4. Validar categorías profesionales
const allWarnings = [];

if (Array.isArray(perfil.categorias_profesionales)) {
  perfil.categorias_profesionales.forEach((cat, i) => {
    allWarnings.push(...validateCategoria(cat, i));
  });
  console.log(
    `✓ ${perfil.categorias_profesionales.length} categorías profesionales encontradas`
  );
} else {
  allWarnings.push('categorias_profesionales no es un array o no existe');
  perfil.categorias_profesionales = [];
}

// 4b. Reconciliar con valores_posibles.categoria_profesional
// Claude a veces omite categorías en `categorias_profesionales` (tablas
// fragmentadas, saltos de página) pero sí las lista en `valores_posibles`.
// Para no romper el DataRequestCard en el front (que ofrece estas opciones),
// añadimos como entrada mínima cualquier categoría que falte.
const valoresPosibles = perfil.valores_posibles || {};
const catsPosibles = Array.isArray(valoresPosibles.categoria_profesional)
  ? valoresPosibles.categoria_profesional
  : [];

if (catsPosibles.length > 0) {
  function norm(s) {
    return String(s)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim();
  }
  const existentes = new Set(
    perfil.categorias_profesionales.map(c => norm(c.nombre))
  );
  // También cubrir sinónimos para no duplicar
  perfil.categorias_profesionales.forEach(c => {
    if (Array.isArray(c.sinonimos)) {
      c.sinonimos.forEach(s => existentes.add(norm(s)));
    }
  });

  let added = 0;
  for (const valor of catsPosibles) {
    if (!existentes.has(norm(valor))) {
      perfil.categorias_profesionales.push({ nombre: valor });
      existentes.add(norm(valor));
      added++;
    }
  }
  if (added > 0) {
    const msg = `Reconciliación: añadidas ${added} categoría(s) faltantes desde valores_posibles.categoria_profesional`;
    allWarnings.push(msg);
    console.log(`⚠ ${msg}`);
  }
}

// 5. Validar complementos
if (Array.isArray(perfil.complementos)) {
  perfil.complementos.forEach((comp, i) => {
    allWarnings.push(...validateComplemento(comp, i));
  });
  console.log(`✓ ${perfil.complementos.length} complementos encontrados`);
}

// 6. Validar variables_criticas
if (Array.isArray(perfil.variables_criticas)) {
  console.log(
    `✓ ${perfil.variables_criticas.length} variables críticas: ${perfil.variables_criticas.join(', ')}`
  );
} else {
  allWarnings.push('variables_criticas no es un array o no existe');
}

// 7. Log de warnings
if (allWarnings.length > 0) {
  console.log(`⚠ ${allWarnings.length} warnings de validación:`);
  allWarnings.forEach(w => console.log(`  - ${w}`));
}

// 8. Construir resultado de validación
const validationResult = {
  is_valid: missingFields.length === 0,
  missing_fields: missingFields,
  warnings: allWarnings,
  stats: {
    categorias: Array.isArray(perfil.categorias_profesionales)
      ? perfil.categorias_profesionales.length
      : 0,
    complementos: Array.isArray(perfil.complementos)
      ? perfil.complementos.length
      : 0,
    variables_criticas: Array.isArray(perfil.variables_criticas)
      ? perfil.variables_criticas.length
      : 0,
    tiene_jornada: !!perfil.jornada,
    tiene_horas_extra: !!perfil.horas_extra,
    tiene_periodo_prueba:
      Array.isArray(perfil.periodo_prueba) && perfil.periodo_prueba.length > 0,
    tiene_vacaciones: !!perfil.vacaciones,
    tiene_tablas_salariales: !!perfil.tablas_salariales
  }
};

console.log(
  `\n✓ Validación completa: ${validationResult.is_valid ? 'VÁLIDO' : 'CON CAMPOS FALTANTES'}`
);
console.log(`  Categorías: ${validationResult.stats.categorias}`);
console.log(`  Complementos: ${validationResult.stats.complementos}`);
console.log(
  `  Variables críticas: ${validationResult.stats.variables_criticas}`
);

return [
  {
    json: {
      perfil_data: perfil,
      convenio_id: convenioId,
      convenio_nombre: convenioNombre,
      validation: validationResult,
      claude_usage: claudeUsage
    }
  }
];
