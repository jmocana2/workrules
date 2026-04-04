// ============================================
// NODO: Chunk Markdown
// WORKFLOW: Workrules Convenios - Indexer
// TIPO: Code (JavaScript) v2
// ============================================

// ============================================
// CONFIGURACIÓN
// ============================================
const TARGET_TOKENS = 450; // Target ideal
const MAX_TOKENS = 600; // Límite duro
const MIN_TOKENS = 100; // Mínimo para chunk válido (contenido genérico)
const MIN_TOKENS_ARTICULO = 25; // Mínimo para artículos (pueden ser muy cortos pero son unidades semánticas)
const OVERLAP_CHARS = 200; // ~50 tokens de overlap

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function estimateTokens(text) {
  if (!text) return 0;
  const words = text.split(/\s+/).length;
  const chars = text.length;
  return Math.round((chars / 4 + words * 1.3) / 2);
}

function detectChunkType(content) {
  if (/\|.*\|/.test(content) && /salario|retribuc|sueldo|euro|€/i.test(content))
    return 'tabla_salarial';
  if (/\|.*\|/.test(content)) return 'tabla';
  if (/se entiende por|a los efectos|definición|concepto/i.test(content))
    return 'definicion';
  if (
    /procedimiento|solicitud|plazo de|días (hábiles|naturales)/i.test(content)
  )
    return 'procedimiento';
  if (/jornada|horario|descanso|vacaciones|permiso/i.test(content))
    return 'jornada';
  if (/falta (leve|grave|muy grave)|sanción|despido/i.test(content))
    return 'sanciones';
  return 'normativa';
}

function extractSeccion(content, previousSeccion) {
  const match = content.match(/^##\s+(.+)$/m);
  if (match) return match[1].trim();
  return previousSeccion || null;
}

/**
 * Detecta si estamos en una sección de ANEXO (no tiene artículos numerados)
 * Los anexos incluyen: tablas salariales, disposiciones, categorías profesionales, etc.
 */
function isAnexoSection(seccion) {
  if (!seccion) return false;
  const seccionLower = seccion.toLowerCase();
  return (
    seccionLower.includes('anexo') ||
    seccionLower.includes('tabla') ||
    seccionLower.includes('disposicion') ||
    seccionLower.includes('clasificación profesional') ||
    seccionLower.includes('clasificacion profesional') ||
    seccionLower.includes('categorías profesionales') ||
    seccionLower.includes('categorias profesionales') ||
    seccionLower.includes('niveles retributivos') ||
    seccionLower.includes('grupos profesionales')
  );
}

function extractArticulo(content, previousArticulo, currentSeccion) {
  // ============================================
  // EXTRACCIÓN DE ARTÍCULOS DEL CONVENIO
  // ============================================
  // IMPORTANTE: Solo capturamos artículos QUE PERTENECEN AL CONVENIO,
  // NO referencias a otras leyes (Estatuto de los Trabajadores, etc.)

  // Patrón 1: Markdown heading ### Art. X o ### Artículo X (más confiable)
  // Ejemplo: "### Art. 18.- Vacaciones"
  const matchH3 = content.match(
    /^###\s+(Art(?:ículo|\.)\s*\d+[º°]?[\.\-]?\s*[^\n]*)/im
  );
  if (matchH3) {
    return normalizeArticulo(matchH3[1].trim());
  }

  // Patrón 2: Negrita markdown **Art. X** o **Artículo X**
  // Ejemplo: "**Art. 8.- Período de prueba**"
  const matchBold = content.match(
    /^\*{1,2}(Art(?:ículo|\.)\s*\d+[º°]?[\.\-]?\s*[^\n*]*)\*{0,2}/im
  );
  if (matchBold) {
    const fullMatch = matchBold[1];
    if (!isReferenciaExterna(fullMatch)) {
      return normalizeArticulo(fullMatch.trim());
    }
  }

  // Patrón 3: Artículo al INICIO de línea (encabezado sin markdown)
  // Ejemplo: "Art. 18.- Vacaciones" o "Artículo 18 - Vacaciones"
  // IMPORTANTE: Debe estar al inicio de línea (^) para evitar capturar referencias internas
  const artStartMatch = content.match(
    /^(Art(?:ículo|\.)\s*(\d+)[º°]?[\.\-]?\s*[–\-:]?\s*([A-ZÁÉÍÓÚÑ][^\n]*))/im
  );
  if (artStartMatch) {
    // Verificar que NO es una referencia a otra ley
    const fullMatch = artStartMatch[1];
    if (!isReferenciaExterna(fullMatch)) {
      return normalizeArticulo(fullMatch.trim());
    }
  }

  // Patrón 3: "14.- Jornada" o "14.- **Jornada**" (formato BOCM)
  // Solo al inicio de línea para evitar falsos positivos
  const bocmMatch = content.match(
    /^(\d+)\.\-\s*\*{0,2}[A-ZÁÉÍÓÚÑ][^\n*]{2,50}\*{0,2}/m
  );
  if (bocmMatch) {
    const num = bocmMatch[1];
    // Solo aceptar si el número es razonable (1-200) para artículos de convenio
    if (parseInt(num) >= 1 && parseInt(num) <= 200) {
      return `Art. ${num}`;
    }
  }

  // Patrón 4: "Artículo 14 - Descansos" (con guión y espacio)
  const articuloConGuion = content.match(
    /^(Artículo\s+(\d+)\s*[\-–]\s*([A-ZÁÉÍÓÚÑ][^\n]*))/im
  );
  if (articuloConGuion) {
    const num = articuloConGuion[2];
    return `Art. ${num}`;
  }

  // Si estamos en una sección de ANEXO, NO heredar artículos anteriores
  // Los anexos no tienen artículos numerados, usar null para que se use la sección
  if (isAnexoSection(currentSeccion)) {
    return null;
  }

  // Si no encuentra nada, heredar del anterior
  return previousArticulo || null;
}

/**
 * Detecta si una referencia es a una ley externa (no al convenio actual)
 */
function isReferenciaExterna(text) {
  const patronesExternos = [
    /estatuto\s+de\s+(los\s+)?trabajadores/i,
    /real\s+decreto/i,
    /ley\s+\d+\/\d+/i,
    /código\s+civil/i,
    /ley\s+orgánica/i,
    /constitución/i,
    /dicho\s+real\s+decreto/i,
    /l\.?o\.?\s+\d+/i // LO 3/2007, etc.
  ];

  return patronesExternos.some(patron => patron.test(text));
}

/**
 * Normaliza el formato del artículo para consistencia
 * Entrada: "Art. 18.- Vacaciones" o "Artículo 18 - Vacaciones"
 * Salida: "Art. 18" (formato corto y consistente)
 */
function normalizeArticulo(articulo) {
  if (!articulo) return null;

  // Extraer solo el número del artículo
  const numMatch = articulo.match(/Art(?:ículo|\.)\s*(\d+)/i);
  if (numMatch) {
    return `Art. ${numMatch[1]}`;
  }

  // Si no podemos normalizar, devolver limpio
  return articulo.replace(/\*+/g, '').trim();
}

function hasTable(content) {
  const tablePattern = /\|[^\n]+\|[\s\S]*?\|[^\n]+\|/;
  return tablePattern.test(content);
}

function isNewArticle(content) {
  // Detecta si el contenido empieza con un nuevo artículo
  // Patrones: "### Art. X", "### Artículo X", "Art. X.-", "X.- Título", "**Art. X"
  return (
    /^###\s+Art/im.test(content) ||
    /^##\s+Art/im.test(content) ||
    /^\*{1,2}Art(?:ículo|\.)\s*\d+/im.test(content) ||
    /^Art(?:ículo|\.)\s*\d+/im.test(content) ||
    /^\d+\.\-\s*\*{0,2}[A-ZÁÉÍÓÚÑ]/m.test(content)
  );
}

/**
 * Divide el contenido en artículos individuales.
 * Busca patrones como "**Art. X.-", "Art. X.-", "## Art. X" etc.
 * y divide el texto en esos puntos.
 */
function splitByArticles(text) {
  const lines = text.split('\n');
  const parts = [];
  let currentPart = '';

  for (const line of lines) {
    const startsNewArticle =
      currentPart.trim() && isNewArticle(line.trimStart());

    if (startsNewArticle) {
      parts.push(currentPart.trim());
      currentPart = line;
      continue;
    }

    currentPart = currentPart ? `${currentPart}\n${line}` : line;
  }

  if (currentPart.trim()) {
    parts.push(currentPart.trim());
  }

  // Si no encontró divisiones, devolver el texto original
  if (parts.length <= 1) {
    return [text];
  }

  return parts;
}

function splitByStructure(markdown) {
  const sections = [];

  // Primero, dividir por artículos (que es la unidad semántica más importante)
  const articleParts = splitByArticles(markdown);

  for (const part of articleParts) {
    // Dentro de cada parte, verificar si tiene headings
    const sectionRegex = /^(#{2,3}\s+[^\n]+)([\s\S]*?)(?=^#{2,3}\s+|$)/gm;
    let match;
    let lastIndex = 0;
    let foundSections = false;

    while ((match = sectionRegex.exec(part)) !== null) {
      foundSections = true;
      if (match.index > lastIndex) {
        const beforeText = part.substring(lastIndex, match.index).trim();
        if (beforeText) sections.push({ type: 'text', content: beforeText });
      }
      sections.push({
        type: 'section',
        header: match[1],
        content: match[0].trim()
      });
      lastIndex = match.index + match[0].length;
    }

    if (foundSections && lastIndex < part.length) {
      const remaining = part.substring(lastIndex).trim();
      if (remaining) sections.push({ type: 'text', content: remaining });
    }

    // Si no encontró headings, añadir la parte como texto
    if (!foundSections && part.trim()) {
      sections.push({ type: 'text', content: part.trim() });
    }
  }

  if (sections.length === 0) {
    return markdown
      .split(/\n\n+/)
      .filter(p => p.trim())
      .map(p => ({ type: 'text', content: p.trim() }));
  }
  return sections;
}

function createChunkObject(
  content,
  number,
  convenioId,
  convenioNombre,
  seccion,
  articulo,
  isTable = false
) {
  const tokens = estimateTokens(content);
  const tipo = isTable ? 'tabla_salarial' : detectChunkType(content);
  return {
    contenido: content,
    metadata: {
      convenio_id: convenioId,
      convenio_nombre: convenioNombre,
      numero_chunk: number,
      tokens: tokens,
      seccion: seccion,
      articulo: articulo,
      tipo: tipo,
      tiene_tabla: isTable,
      total_chunks: 0
    }
  };
}

function getOverlap(text) {
  if (!text || text.length < OVERLAP_CHARS) return '';
  const endPortion = text.substring(text.length - OVERLAP_CHARS * 1.5);
  const sentenceEnd = endPortion.lastIndexOf('. ');
  if (sentenceEnd > 0) return endPortion.substring(sentenceEnd + 2);
  const spaceIndex = endPortion.indexOf(' ');
  if (spaceIndex > 0) return endPortion.substring(spaceIndex + 1);
  return endPortion;
}

// ============================================
// FUNCIÓN PRINCIPAL DE CHUNKING
// ============================================

function chunkMarkdown(markdown, convenioId, convenioNombre) {
  const chunks = [];
  let chunkNumber = 0;
  let currentSeccion = null;
  let currentArticulo = null;
  // Track del artículo asociado al chunk que se está acumulando
  let chunkArticulo = null;
  let chunkSeccion = null;
  const sections = splitByStructure(markdown);
  let currentChunk = '';
  let currentTokens = 0;

  for (const section of sections) {
    const sectionContent = section.content || section;
    const sectionTokens = estimateTokens(sectionContent);

    // Extraer sección y artículo de la sección ACTUAL
    const tempSeccion = extractSeccion(sectionContent, currentSeccion);
    if (tempSeccion) currentSeccion = tempSeccion;
    // Pasar la sección actual para detectar si estamos en un ANEXO
    const tempArticulo = extractArticulo(sectionContent, currentArticulo, currentSeccion);
    // Si estamos en anexo, tempArticulo será null y NO heredamos el anterior
    if (tempArticulo !== undefined) currentArticulo = tempArticulo;

    if (hasTable(sectionContent)) {
      // Guardar chunk anterior con SU artículo (no el actual)
      if (currentChunk.trim()) {
        const articuloDelChunk = extractArticulo(currentChunk, chunkArticulo, chunkSeccion || currentSeccion);
        const minTokensRequeridos = articuloDelChunk
          ? MIN_TOKENS_ARTICULO
          : MIN_TOKENS;
        if (currentTokens >= minTokensRequeridos) {
          chunks.push(
            createChunkObject(
              currentChunk.trim(),
              ++chunkNumber,
              convenioId,
              convenioNombre,
              chunkSeccion || currentSeccion,
              articuloDelChunk
            )
          );
        }
        currentChunk = '';
        currentTokens = 0;
      }
      // Tabla usa el artículo actual
      if (sectionTokens <= MAX_TOKENS * 1.5) {
        chunks.push(
          createChunkObject(
            sectionContent,
            ++chunkNumber,
            convenioId,
            convenioNombre,
            currentSeccion,
            currentArticulo,
            true
          )
        );
      } else {
        const lines = sectionContent.split('\n');
        let tableChunk = '';
        let tableTokens = 0;
        for (const line of lines) {
          const lineTokens = estimateTokens(line);
          if (tableTokens + lineTokens > MAX_TOKENS && tableChunk) {
            chunks.push(
              createChunkObject(
                tableChunk.trim(),
                ++chunkNumber,
                convenioId,
                convenioNombre,
                currentSeccion,
                currentArticulo,
                true
              )
            );
            tableChunk = line + '\n';
            tableTokens = lineTokens;
          } else {
            tableChunk += line + '\n';
            tableTokens += lineTokens;
          }
        }
        if (tableChunk.trim())
          chunks.push(
            createChunkObject(
              tableChunk.trim(),
              ++chunkNumber,
              convenioId,
              convenioNombre,
              currentSeccion,
              currentArticulo,
              true
            )
          );
      }
      chunkArticulo = null;
      chunkSeccion = null;
      continue;
    }

    // Si es un nuevo artículo y ya tenemos contenido, SIEMPRE cerrar el chunk anterior.
    // Los artículos son unidades semánticas y deben mantenerse separados.
    // Usamos MIN_TOKENS_ARTICULO (más bajo) si el chunk contiene un artículo identificado.
    if (isNewArticle(sectionContent) && currentChunk.trim()) {
      const articuloDelChunk = extractArticulo(currentChunk, chunkArticulo, chunkSeccion || currentSeccion);
      // Si el chunk tiene un artículo identificado, usar umbral más bajo
      const minTokensRequeridos = articuloDelChunk
        ? MIN_TOKENS_ARTICULO
        : MIN_TOKENS;

      if (currentTokens >= minTokensRequeridos) {
        chunks.push(
          createChunkObject(
            currentChunk.trim(),
            ++chunkNumber,
            convenioId,
            convenioNombre,
            chunkSeccion || currentSeccion,
            articuloDelChunk
          )
        );
      }
      // Siempre iniciar nuevo chunk con el artículo actual (no fusionar artículos distintos)
      currentChunk = sectionContent;
      currentTokens = sectionTokens;
      chunkArticulo = currentArticulo;
      chunkSeccion = currentSeccion;
      continue;
    }

    if (currentTokens + sectionTokens <= TARGET_TOKENS) {
      // Si es el inicio del chunk, guardar el artículo de esta sección
      if (!currentChunk) {
        chunkArticulo = currentArticulo;
        chunkSeccion = currentSeccion;
      }
      currentChunk += (currentChunk ? '\n\n' : '') + sectionContent;
      currentTokens += sectionTokens;
      continue;
    }

    if (sectionTokens >= MIN_TOKENS && sectionTokens <= MAX_TOKENS) {
      // Guardar chunk anterior con SU artículo
      if (currentChunk.trim()) {
        const articuloDelChunk = extractArticulo(currentChunk, chunkArticulo, chunkSeccion || currentSeccion);
        const minTokensRequeridos = articuloDelChunk
          ? MIN_TOKENS_ARTICULO
          : MIN_TOKENS;
        if (currentTokens >= minTokensRequeridos) {
          chunks.push(
            createChunkObject(
              currentChunk.trim(),
              ++chunkNumber,
              convenioId,
              convenioNombre,
              chunkSeccion || currentSeccion,
              articuloDelChunk
            )
          );
        }
      }
      // La sección actual va como chunk independiente con su propio artículo
      chunks.push(
        createChunkObject(
          sectionContent,
          ++chunkNumber,
          convenioId,
          convenioNombre,
          currentSeccion,
          currentArticulo
        )
      );
      currentChunk = '';
      currentTokens = 0;
      chunkArticulo = null;
      chunkSeccion = null;
      continue;
    }

    if (sectionTokens > MAX_TOKENS) {
      // Guardar chunk anterior con SU artículo
      if (currentChunk.trim()) {
        const articuloDelChunk = extractArticulo(currentChunk, chunkArticulo, chunkSeccion || currentSeccion);
        const minTokensRequeridos = articuloDelChunk
          ? MIN_TOKENS_ARTICULO
          : MIN_TOKENS;
        if (currentTokens >= minTokensRequeridos) {
          chunks.push(
            createChunkObject(
              currentChunk.trim(),
              ++chunkNumber,
              convenioId,
              convenioNombre,
              chunkSeccion || currentSeccion,
              articuloDelChunk
            )
          );
        }
        currentChunk = '';
        currentTokens = 0;
      }
      // Iniciar nuevo chunk con el artículo de esta sección
      chunkArticulo = currentArticulo;
      chunkSeccion = currentSeccion;

      const paragraphs = sectionContent.split(/\n\n+/);
      for (const para of paragraphs) {
        const paraTokens = estimateTokens(para);
        if (currentTokens + paraTokens <= TARGET_TOKENS) {
          currentChunk += (currentChunk ? '\n\n' : '') + para;
          currentTokens += paraTokens;
        } else {
          if (currentChunk.trim()) {
            const articuloDelChunk = extractArticulo(
              currentChunk,
              chunkArticulo,
              chunkSeccion || currentSeccion
            );
            const minTokensRequeridos = articuloDelChunk
              ? MIN_TOKENS_ARTICULO
              : MIN_TOKENS;
            if (currentTokens >= minTokensRequeridos) {
              chunks.push(
                createChunkObject(
                  currentChunk.trim(),
                  ++chunkNumber,
                  convenioId,
                  convenioNombre,
                  chunkSeccion || currentSeccion,
                  articuloDelChunk
                )
              );
            }
          }
          const overlap = getOverlap(currentChunk);
          currentChunk = overlap + (overlap ? '\n\n' : '') + para;
          currentTokens = estimateTokens(currentChunk);
          // Mantener el artículo para chunks que continúan
        }
      }
    }
  }

  // Último chunk - usar umbral más bajo si contiene artículo
  if (currentChunk.trim()) {
    const articuloDelChunk = extractArticulo(currentChunk, chunkArticulo, chunkSeccion || currentSeccion);
    const minTokensRequeridos = articuloDelChunk
      ? MIN_TOKENS_ARTICULO
      : MIN_TOKENS;

    if (currentTokens >= minTokensRequeridos) {
      chunks.push(
        createChunkObject(
          currentChunk.trim(),
          ++chunkNumber,
          convenioId,
          convenioNombre,
          chunkSeccion || currentSeccion,
          articuloDelChunk
        )
      );
    }
  }

  const totalChunks = chunks.length;
  chunks.forEach(c => (c.metadata.total_chunks = totalChunks));
  return chunks;
}

// ============================================
// EJECUCIÓN PRINCIPAL
// ============================================

const inputData = $input.first().json;
const convenioData = Array.isArray(inputData) ? inputData[0] : inputData;

if (!convenioData || !convenioData.id) {
  throw new Error(
    'No se pudo obtener el ID del convenio guardado. Data: ' +
      JSON.stringify(inputData)
  );
}

const convenioId = convenioData.id;
const convenioNombre = convenioData.nombre;
const markdown = convenioData.markdown_completo || '';

if (!markdown || markdown.length < 100) {
  throw new Error(
    'Markdown vacío o muy corto para procesar. Longitud: ' + markdown.length
  );
}

const chunks = chunkMarkdown(markdown, convenioId, convenioNombre);

const stats = {
  total_chunks: chunks.length,
  avg_tokens: chunks.length > 0
    ? Math.round(chunks.reduce((sum, c) => sum + c.metadata.tokens, 0) / chunks.length)
    : 0,
  min_tokens: chunks.length > 0
    ? Math.min(...chunks.map(c => c.metadata.tokens))
    : 0,
  max_tokens: chunks.length > 0
    ? Math.max(...chunks.map(c => c.metadata.tokens))
    : 0,
  con_tablas: chunks.filter(c => c.metadata.tiene_tabla).length,
  tipos: {}
};

chunks.forEach(c => {
  stats.tipos[c.metadata.tipo] = (stats.tipos[c.metadata.tipo] || 0) + 1;
});

return chunks.map((chunk, index) => ({
  json: {
    contenido: chunk.contenido,
    convenio_id: chunk.metadata.convenio_id,
    metadata: chunk.metadata,
    ...(index === 0 ? { chunking_stats: stats } : {})
  }
}));
