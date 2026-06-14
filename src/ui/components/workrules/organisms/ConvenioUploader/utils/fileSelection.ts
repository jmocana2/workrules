/**
 * Abre un selector de archivos nativo del navegador para archivos PDF
 * @param onFileSelect - Callback que recibe el archivo seleccionado (tras validación síncrona)
 * @param onError - Callback que recibe el mensaje de error de validación
 * @param maxSizeMB - Tamaño máximo permitido en MB (por defecto 25MB)
 * @returns void
 */
export function openPdfFileSelector(
  onFileSelect: (file: File) => void,
  onError?: (error: string) => void,
  maxSizeMB: number = 25,
): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/pdf";

  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const validationError = await validatePdfFileAsync(file, maxSizeMB);
      if (validationError) {
        onError?.(validationError);
        return;
      }
      onFileSelect(file);
    }
  };

  input.click();
}

/**
 * Validación síncrona rápida (mime + tamaño). No detecta cifrado.
 * Mantenida para callers que no pueden ser async.
 */
export function validatePdfFile(
  file: File,
  maxSizeMB: number = 25,
): string | null {
  if (file.type !== "application/pdf") {
    return "Solo se permiten archivos PDF";
  }

  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return `El archivo excede el límite de ${maxSizeMB}MB`;
  }

  if (file.size === 0) {
    return "El archivo está vacío";
  }

  return null;
}

/**
 * Validación completa: mime, tamaño, cabecera %PDF- y detección de PDF cifrado.
 * Lee solo los primeros 4KB del archivo.
 */
export async function validatePdfFileAsync(
  file: File,
  maxSizeMB: number = 25,
): Promise<string | null> {
  const syncError = validatePdfFile(file, maxSizeMB);
  if (syncError) return syncError;

  try {
    const headBytes = await file.slice(0, 4096).arrayBuffer();
    const headText = new TextDecoder("latin1").decode(headBytes);

    // Cabecera PDF estándar: "%PDF-1.x" o "%PDF-2.x"
    if (!headText.startsWith("%PDF-")) {
      return "El archivo no es un PDF válido";
    }

    // /Encrypt en el trailer indica que hay diccionario de cifrado, pero NO
    // implica que se necesite contraseña para leer: muchos PDFs oficiales (BOE,
    // boletines autonómicos) llevan /Encrypt solo para restringir edición o
    // impresión, manteniendo el contenido legible. Solo bloqueamos cuando el
    // diccionario indica que la extracción de contenido está prohibida.
    const tailSize = Math.min(8192, file.size);
    const tailBytes = await file
      .slice(file.size - tailSize, file.size)
      .arrayBuffer();
    const tailText = new TextDecoder("latin1").decode(tailBytes);

    if (
      /\/Encrypt\b/.test(headText) ||
      /\/Encrypt\b/.test(tailText)
    ) {
      const fullBytes = await file.arrayBuffer();
      const fullText = new TextDecoder("latin1").decode(fullBytes);
      if (blocksContentExtraction(fullText)) {
        return "El PDF está protegido con contraseña. Sube una versión sin cifrar.";
      }
    }
  } catch {
    return "No se pudo leer el archivo para validarlo";
  }

  return null;
}

/**
 * Determina si un PDF con diccionario /Encrypt requiere contraseña de usuario
 * para extraer su contenido. Devuelve true solo cuando estamos razonablemente
 * seguros de que el contenido está bloqueado; ante la duda devuelve false para
 * dejar que el backend de extracción sea la fuente de verdad.
 *
 * Basado en PDF 1.7 §7.6.3: el campo /P del diccionario Encrypt es un entero de
 * 32 bits con bits de permisos. El bit 5 (valor 16) controla copia de texto;
 * el bit 10 (valor 512, solo R≥3) controla extracción para accesibilidad.
 * Si alguno está activo el contenido es extraíble sin contraseña de usuario.
 */
function blocksContentExtraction(pdfText: string): boolean {
  const encryptRef = /\/Encrypt\s+(\d+)\s+(\d+)\s+R/.exec(pdfText);
  let dict: string | null = null;
  if (encryptRef) {
    const objRegex = new RegExp(
      `\\b${encryptRef[1]}\\s+${encryptRef[2]}\\s+obj\\b([\\s\\S]*?)\\bendobj\\b`,
    );
    dict = objRegex.exec(pdfText)?.[1] ?? null;
  } else {
    const inline = /\/Encrypt\s*<<([\s\S]*?)>>/.exec(pdfText);
    dict = inline?.[1] ?? null;
  }

  if (!dict) return false;

  const pMatch = /\/P\s+(-?\d+)/.exec(dict);
  const rMatch = /\/R\s+(\d+)/.exec(dict);
  if (!pMatch || !rMatch) return false;

  const p = Number(pMatch[1]) >>> 0;
  const r = Number(rMatch[1]);

  const COPY_BIT = 1 << 4;
  const ACCESSIBILITY_BIT = 1 << 9;

  const canCopy = (p & COPY_BIT) !== 0;
  const canExtractForAccessibility =
    r >= 3 ? (p & ACCESSIBILITY_BIT) !== 0 : canCopy;

  return !canCopy && !canExtractForAccessibility;
}
