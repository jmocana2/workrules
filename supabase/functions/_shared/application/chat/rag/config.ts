/**
 * Configuración RAG del use case AskQuestion.
 *
 * Estos knobs los ajusta el equipo de RAG; viven aislados del flujo para que
 * cambiarlos no obligue a tocar la lógica del orquestador.
 */

export const DEFAULT_CHUNK_LIMIT = 8;
export const DEFAULT_CHUNK_THRESHOLD = 0.45;
export const CACHE_THRESHOLD = 0.95;
export const MODEL_NAME = "claude-sonnet-4-5";
/** Tope total tras expandir con vecinos de la misma sección/artículo */
export const EXPANDED_CHUNK_CAP = 15;
