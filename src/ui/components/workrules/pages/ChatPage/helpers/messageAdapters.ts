import type { UIMessage } from "ai";

/**
 * Extrae el texto plano de un `UIMessage` del Vercel AI SDK. Prioriza el
 * campo legacy `content` (string) si existe; en caso contrario concatena los
 * `parts` de tipo `text`.
 */
export function getMessageText(message: UIMessage): string {
  const legacyContent = (message as { content?: unknown }).content;
  if (typeof legacyContent === "string" && legacyContent.length > 0) {
    return legacyContent;
  }

  return message.parts
    .filter((part): part is { type: "text"; text: string } =>
      part.type === "text"
    )
    .map((part) => part.text)
    .join("\n");
}

/**
 * Construye la URL final del PDF con el ancla de página cuando el backend
 * devuelve una página concreta. Devuelve string vacío si no hay URL.
 */
export function buildPdfHref(
  urlPdf: string | null | undefined,
  pagina: number | null | undefined,
): string {
  if (!urlPdf) return "";
  return pagina != null ? `${urlPdf}#page=${pagina}` : urlPdf;
}
