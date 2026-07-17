// supabase/functions/_shared/core/chat/sse/anthropic-stream.ts

import type { ChatCitation } from "../types.ts";
import { encodeCitation, encodeDone, encodeEvent } from "./sse-encoder.ts";

/**
 * Transforma ReadableStream de Anthropic en SSE events (`text`/`citation`/`done`)
 * y dispara `cleanup` fire-and-forget al finalizar.
 */
export function handleStreamResponse(
  stream: ReadableStream<Uint8Array>,
  cleanup: (fullResponse: string) => Promise<void>,
  citations: ChatCitation[],
  headers: Record<string, string>,
  resolvedVariables?: Record<string, string>,
): Response {
  const decoder = new TextDecoder();
  let fullResponse = "";

  const transformedStream = stream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        const text = decoder.decode(chunk, { stream: true });
        fullResponse += text;
        controller.enqueue(encodeEvent("text", { content: text }));
      },
      flush(controller) {
        for (const citation of citations) {
          controller.enqueue(encodeCitation(citation));
        }

        controller.enqueue(
          encodeDone({
            response_length: fullResponse.length,
            ...(resolvedVariables && Object.keys(resolvedVariables).length > 0
              ? { resolvedVariables }
              : {}),
          }),
        );

        const cleanupTask = cleanup(fullResponse).catch((err) => {
          console.error("[handlers] Stream cleanup error:", err);
        });
        // Mantiene vivo el trabajo post-stream (guardar mensaje, cache semántica)
        // más allá del cierre del SSE. `EdgeRuntime` sólo existe en Supabase Edge
        // Runtime; en entornos de test/dev se ignora silenciosamente.
        const runtime = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } })
          .EdgeRuntime;
        runtime?.waitUntil?.(cleanupTask);
      },
    }),
  );

  return new Response(transformedStream, { headers });
}
