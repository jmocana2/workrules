// ============================================
// NODO: Extract Metadata from Markdown
// UBICACIÓN: entre "Extract and clean md" y "Check Duplicate Convenio"
// FUNCIÓN: Extraer del texto del PDF (ya en markdown) los identificadores
//          oficiales del BOE que no vienen en el webhook:
//          - codigo_convenio        (14 dígitos) → identifica la FAMILIA
//          - numero_expediente_regcon (NN/NN/NNNNN/YYYY) → identifica la VERSIÓN
//          - fecha_vigencia         (ISO date)
//
// COMPORTAMIENTO: si un campo no se encuentra, se devuelve null. NO se lanza
// error — el convenio seguirá el flujo y podrá acabar como activo_sin_perfil
// para revisión manual.
//
// Contexto: docs/analysis/convenio-familias-plan.md §2.1
// ============================================

const input = $input.first().json;
const markdown = input.markdown_completo || '';

// -------------------------------------------------------------
// 1. Código de convenio (14 dígitos)
// -------------------------------------------------------------
// Ejemplos en el BOE:
//   "código de convenio 29000945011981"
//   "código de convenio n.º 29000945011981"
//   "código: 29000945011981"
function extractCodigoConvenio(text) {
  const patterns = [
    /c[oó]digo\s+de\s+convenio\D{0,20}(\d{14})/i,
    /c[oó]digo\s+convenio\D{0,20}(\d{14})/i,
    /c[oó]digo\D{0,5}(\d{14})/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[1];
  }
  return null;
}

// -------------------------------------------------------------
// 2. Número de expediente REGCON (NN/NN/NNNNN/YYYY)
// -------------------------------------------------------------
// Ejemplos:
//   "número de expediente 29/01/00165/2020"
//   "expediente REGCON 29/01/0364/2023"
//   "REGCON con fecha ... número de expediente 29/01/00165/2020"
// El bloque central admite 4-5 dígitos porque el ancho no es fijo.
function extractExpediente(text) {
  const patterns = [
    /(?:REGCON|expediente)\D{0,40}(\d{2}\/\d{2}\/\d{4,5}\/\d{4})/i,
    /(?:n[uú]mero\s+de\s+expediente)\D{0,20}(\d{2}\/\d{2}\/\d{4,5}\/\d{4})/i,
    /\b(\d{2}\/\d{2}\/\d{4,5}\/\d{4})\b/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[1];
  }
  return null;
}

// -------------------------------------------------------------
// 3. Fecha de vigencia
// -------------------------------------------------------------
// Prioridad:
//   1. "fecha de entrada en vigor"
//   2. "entrará en vigor el ..."
//   3. "vigencia desde ..."
//   4. Fallback: fecha del BOP/BOE citada como publicación (menos fiable).
//
// Se aceptan dos formatos:
//   - "3 de noviembre de 2020"      (largo, meses en español)
//   - "03/11/2020" / "03-11-2020"   (corto)
const MESES = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10,
  noviembre: 11, diciembre: 12,
};

function toIso(year, month, day) {
  const y = String(year).padStart(4, '0');
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseFechaLarga(match) {
  const [, dia, mesTxt, anio] = match;
  const mes = MESES[mesTxt.toLowerCase()];
  if (!mes) return null;
  return toIso(anio, mes, dia);
}

function parseFechaCorta(match) {
  const [, dia, mes, anio] = match;
  return toIso(anio, mes, dia);
}

function extractFechaVigencia(text) {
  const RE_LARGA = /(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})/i;
  const RE_CORTA = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/;

  // Búsqueda contextual: buscamos primero el disparador, luego una fecha cerca.
  const disparadores = [
    /fecha\s+de\s+entrada\s+en\s+vigor[^.]{0,120}/i,
    /entrar[aá]\s+en\s+vigor[^.]{0,120}/i,
    /vigencia\s+desde[^.]{0,120}/i,
    /entra\s+en\s+vigor[^.]{0,120}/i,
    /surtir[aá]\s+efectos\s+desde[^.]{0,120}/i,
    /ser[aá]\s+de\s+aplicaci[oó]n[^.]{0,80}desde[^.]{0,120}/i,
    /aplicaci[oó]n[^.]{0,40}desde\s+el\s+d[ií]a[^.]{0,80}/i,
  ];

  for (const trigger of disparadores) {
    const bloque = text.match(trigger);
    if (!bloque) continue;
    const fragmento = bloque[0];
    const mLarga = fragmento.match(RE_LARGA);
    if (mLarga) {
      const iso = parseFechaLarga(mLarga);
      if (iso) return iso;
    }
    const mCorta = fragmento.match(RE_CORTA);
    if (mCorta) return parseFechaCorta(mCorta);
  }

  // Fallback: fecha del BOP/BOE citada como publicación.
  const boe = text.match(/BO[PE]\D{0,40}(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})/i);
  if (boe) {
    const iso = parseFechaLarga(boe);
    if (iso) return iso;
  }

  return null;
}

// -------------------------------------------------------------
// Ejecución
// -------------------------------------------------------------
const codigoConvenio = extractCodigoConvenio(markdown);
const numeroExpediente = extractExpediente(markdown);
const fechaVigencia = extractFechaVigencia(markdown);

console.log('[extract_metadata] codigo_convenio:', codigoConvenio);
console.log('[extract_metadata] numero_expediente_regcon:', numeroExpediente);
console.log('[extract_metadata] fecha_vigencia:', fechaVigencia);

// Propagamos todo lo anterior y sobrescribimos solo si detectamos algo. Si el
// webhook trajo valores manualmente, tienen prioridad sobre la extracción.
return [{
  json: {
    ...input,
    codigo_convenio: input.codigo_convenio || codigoConvenio,
    numero_expediente_regcon: input.numero_expediente_regcon || numeroExpediente,
    fecha_vigencia: input.fecha_vigencia || fechaVigencia,
    _metadata_extraction: {
      codigo_convenio_detected: codigoConvenio,
      numero_expediente_regcon_detected: numeroExpediente,
      fecha_vigencia_detected: fechaVigencia,
    },
  },
}];
