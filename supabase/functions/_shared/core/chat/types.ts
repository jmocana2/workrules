/** Request del endpoint POST /chat */
export interface ChatRequest {
  convenio_id: string;
  pregunta: string;
  variables?: Record<string, string>;
  session_id?: string;
  stream?: boolean;
}

/** Respuesta no-streaming */
export interface ChatResponse {
  status: 'ok' | 'error' | 'incomplete';
  respuesta: string;
  fuentes: ChatCitation[];
  metadata: ChatMetadata;
}

/** Citacion a un articulo del convenio */
export interface ChatCitation {
  articulo: string;
  seccion: string | null;
  chunk_id: string;
  relevance_score: number;
}

/** Metadata de la respuesta */
export interface ChatMetadata {
  model: string;
  tokens_used: number;
  chunks_retrieved: number;
  cache_hit: boolean;
  classification: 'general' | 'salary' | 'incomplete' | 'invalid';
  latency_ms: number;
}

/** Evento SSE para streaming */
export type SSEEvent =
  | { type: 'text'; content: string }
  | { type: 'citation'; articulo: string; seccion: string | null }
  | { type: 'done'; metadata: ChatMetadata }
  | { type: 'error'; message: string };
