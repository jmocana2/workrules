// supabase/functions/_shared/core/chat/sse/sse-encoder.ts

import type { ChatCitation } from "../types.ts";

const encoder = new TextEncoder();

/**
 * Codifica un evento SSE genérico como `data: {json}\n\n`.
 * El campo `type` va primero en el JSON para preservar el orden actual del
 * protocolo — el front (`useChatStream.ts`) parsea con expectativas exactas.
 */
export function encodeEvent(
  type: string,
  payload: Record<string, unknown> = {},
): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
}

/**
 * Codifica un evento `citation` con el shape que espera el front.
 */
export function encodeCitation(citation: ChatCitation): Uint8Array {
  return encodeEvent("citation", {
    articulo: citation.articulo,
    seccion: citation.seccion,
    url_pdf: citation.url_pdf,
    pagina: citation.pagina,
  });
}

/**
 * Codifica el evento final `done` con metadata opcional.
 */
export function encodeDone(metadata: Record<string, unknown>): Uint8Array {
  return encodeEvent("done", { metadata });
}
