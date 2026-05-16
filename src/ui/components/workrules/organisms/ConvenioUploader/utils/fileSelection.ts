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

    // Diccionario /Encrypt indica PDF protegido con contraseña o cifrado.
    // Buscamos en los primeros KB; los PDF cifrados declaran /Encrypt en el trailer
    // pero también suele aparecer pronto en el cross-reference. Para mayor cobertura,
    // leemos también el final del archivo.
    if (/\/Encrypt\b/.test(headText)) {
      return "El PDF está protegido con contraseña. Sube una versión sin cifrar.";
    }

    const tailSize = Math.min(8192, file.size);
    const tailBytes = await file
      .slice(file.size - tailSize, file.size)
      .arrayBuffer();
    const tailText = new TextDecoder("latin1").decode(tailBytes);
    if (/\/Encrypt\b/.test(tailText)) {
      return "El PDF está protegido con contraseña. Sube una versión sin cifrar.";
    }
  } catch {
    return "No se pudo leer el archivo para validarlo";
  }

  return null;
}
