/**
 * Abre un selector de archivos nativo del navegador para archivos PDF
 * @param onFileSelect - Callback que recibe el archivo seleccionado
 * @param maxSizeMB - Tamaño máximo permitido en MB (por defecto 10MB)
 * @returns void
 */
export function openPdfFileSelector(
  onFileSelect: (file: File) => void,
  onError?: (error: string) => void,
  maxSizeMB: number = 10,
): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/pdf";

  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const validationError = validatePdfFile(file, maxSizeMB);
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
 * Valida que un archivo sea un PDF válido y no exceda el tamaño máximo
 * @param file - El archivo a validar
 * @param maxSizeMB - Tamaño máximo permitido en MB
 * @returns null si es válido, string con mensaje de error si no lo es
 */
export function validatePdfFile(
  file: File,
  maxSizeMB: number = 10,
): string | null {
  // Validar tipo MIME
  if (file.type !== "application/pdf") {
    return "Solo se permiten archivos PDF";
  }

  // Validar tamaño
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return `El archivo excede el límite de ${maxSizeMB}MB`;
  }

  return null;
}
