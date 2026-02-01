// ============================================
// NODO: Chunk Markdown
// WORKFLOW: Workrules Convenios - Indexer
// TIPO: Code (JavaScript) v2
// ============================================

// ============================================
// CONFIGURACIÓN
// ============================================
const TARGET_TOKENS = 450;      // Target ideal
const MAX_TOKENS = 600;         // Límite duro
const MIN_TOKENS = 100;         // Mínimo para chunk válido
const OVERLAP_CHARS = 200;      // ~50 tokens de overlap

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
  if (/\|.*\|/.test(content) && /salario|retribuc|sueldo|euro|€/i.test(content)) return 'tabla_salarial';
  if (/\|.*\|/.test(content)) return 'tabla';
  if (/se entiende por|a los efectos|definición|concepto/i.test(content)) return 'definicion';
  if (/procedimiento|solicitud|plazo de|días (hábiles|naturales)/i.test(content)) return 'procedimiento';
  if (/jornada|horario|descanso|vacaciones|permiso/i.test(content)) return 'jornada';
  if (/falta (leve|grave|muy grave)|sanción|despido/i.test(content)) return 'sanciones';
  return 'normativa';
}

function extractSeccion(content, previousSeccion) {
  const match = content.match(/^##\s+(.+)$/m);
  if (match) return match[1].trim();
  return previousSeccion || null;
}

function extractArticulo(content, previousArticulo) {
  const match = content.match(/^###\s+(.+)$/m);
  if (match) return match[1].trim();
  const artMatch = content.match(/Artículo\s+\d+[º°]?\.?\s*[–\-:]?\s*([^\n]+)/i);
  if (artMatch) return artMatch[0].trim();
  return previousArticulo || null;
}

function hasTable(content) {
  const tablePattern = /\|[^\n]+\|[\s\S]*?\|[^\n]+\|/;
  return tablePattern.test(content);
}

function splitByStructure(markdown) {
  const sections = [];
  const sectionRegex = /^(#{2,3}\s+[^\n]+)([\s\S]*?)(?=^#{2,3}\s+|\z)/gm;
  let match;
  let lastIndex = 0;

  while ((match = sectionRegex.exec(markdown)) !== null) {
    if (match.index > lastIndex) {
      const beforeText = markdown.substring(lastIndex, match.index).trim();
      if (beforeText) sections.push({ type: 'text', content: beforeText });
    }
    sections.push({ type: 'section', header: match[1], content: match[0].trim() });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < markdown.length) {
    const remaining = markdown.substring(lastIndex).trim();
    if (remaining) sections.push({ type: 'text', content: remaining });
  }

  if (sections.length === 0) {
    return markdown.split(/\n\n+/).filter(p => p.trim()).map(p => ({ type: 'text', content: p.trim() }));
  }
  return sections;
}

function createChunkObject(content, number, convenioId, convenioNombre, seccion, articulo, isTable = false) {
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
  const sections = splitByStructure(markdown);
  let currentChunk = '';
  let currentTokens = 0;

  for (const section of sections) {
    const sectionContent = section.content || section;
    const sectionTokens = estimateTokens(sectionContent);
    const tempSeccion = extractSeccion(sectionContent, currentSeccion);
    if (tempSeccion) currentSeccion = tempSeccion;
    const tempArticulo = extractArticulo(sectionContent, currentArticulo);
    if (tempArticulo) currentArticulo = tempArticulo;

    if (hasTable(sectionContent)) {
      if (currentChunk.trim() && currentTokens >= MIN_TOKENS) {
        chunks.push(createChunkObject(currentChunk.trim(), ++chunkNumber, convenioId, convenioNombre, currentSeccion, currentArticulo));
        currentChunk = ''; currentTokens = 0;
      }
      if (sectionTokens <= MAX_TOKENS * 1.5) {
        chunks.push(createChunkObject(sectionContent, ++chunkNumber, convenioId, convenioNombre, currentSeccion, currentArticulo, true));
      } else {
        const lines = sectionContent.split('\n');
        let tableChunk = ''; let tableTokens = 0;
        for (const line of lines) {
          const lineTokens = estimateTokens(line);
          if (tableTokens + lineTokens > MAX_TOKENS && tableChunk) {
            chunks.push(createChunkObject(tableChunk.trim(), ++chunkNumber, convenioId, convenioNombre, currentSeccion, currentArticulo, true));
            tableChunk = line + '\n'; tableTokens = lineTokens;
          } else { tableChunk += line + '\n'; tableTokens += lineTokens; }
        }
        if (tableChunk.trim()) chunks.push(createChunkObject(tableChunk.trim(), ++chunkNumber, convenioId, convenioNombre, currentSeccion, currentArticulo, true));
      }
      continue;
    }

    if (currentTokens + sectionTokens <= TARGET_TOKENS) {
      currentChunk += (currentChunk ? '\n\n' : '') + sectionContent;
      currentTokens += sectionTokens;
      continue;
    }

    if (sectionTokens >= MIN_TOKENS && sectionTokens <= MAX_TOKENS) {
      if (currentChunk.trim() && currentTokens >= MIN_TOKENS)
        chunks.push(createChunkObject(currentChunk.trim(), ++chunkNumber, convenioId, convenioNombre, currentSeccion, currentArticulo));
      chunks.push(createChunkObject(sectionContent, ++chunkNumber, convenioId, convenioNombre, currentSeccion, currentArticulo));
      currentChunk = ''; currentTokens = 0;
      continue;
    }

    if (sectionTokens > MAX_TOKENS) {
      if (currentChunk.trim() && currentTokens >= MIN_TOKENS) {
        chunks.push(createChunkObject(currentChunk.trim(), ++chunkNumber, convenioId, convenioNombre, currentSeccion, currentArticulo));
        currentChunk = ''; currentTokens = 0;
      }
      const paragraphs = sectionContent.split(/\n\n+/);
      for (const para of paragraphs) {
        const paraTokens = estimateTokens(para);
        if (currentTokens + paraTokens <= TARGET_TOKENS) {
          currentChunk += (currentChunk ? '\n\n' : '') + para;
          currentTokens += paraTokens;
        } else {
          if (currentChunk.trim() && currentTokens >= MIN_TOKENS)
            chunks.push(createChunkObject(currentChunk.trim(), ++chunkNumber, convenioId, convenioNombre, currentSeccion, currentArticulo));
          const overlap = getOverlap(currentChunk);
          currentChunk = overlap + (overlap ? '\n\n' : '') + para;
          currentTokens = estimateTokens(currentChunk);
        }
      }
    }
  }

  if (currentChunk.trim() && currentTokens >= MIN_TOKENS)
    chunks.push(createChunkObject(currentChunk.trim(), ++chunkNumber, convenioId, convenioNombre, currentSeccion, currentArticulo));

  const totalChunks = chunks.length;
  chunks.forEach(c => c.metadata.total_chunks = totalChunks);
  return chunks;
}

// ============================================
// EJECUCIÓN PRINCIPAL
// ============================================

const inputData = $input.first().json;
const convenioData = Array.isArray(inputData) ? inputData[0] : inputData;

if (!convenioData || !convenioData.id) {
  throw new Error('No se pudo obtener el ID del convenio guardado. Data: ' + JSON.stringify(inputData));
}

const convenioId = convenioData.id;
const convenioNombre = convenioData.nombre;
const markdown = convenioData.markdown_completo || '';

if (!markdown || markdown.length < 100) {
  throw new Error('Markdown vacío o muy corto para procesar. Longitud: ' + markdown.length);
}

const chunks = chunkMarkdown(markdown, convenioId, convenioNombre);

const stats = {
  total_chunks: chunks.length,
  avg_tokens: Math.round(chunks.reduce((sum, c) => sum + c.metadata.tokens, 0) / chunks.length),
  min_tokens: Math.min(...chunks.map(c => c.metadata.tokens)),
  max_tokens: Math.max(...chunks.map(c => c.metadata.tokens)),
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
