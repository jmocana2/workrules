// Stub - Se implementa en I2.2
// import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Buscar chunks relevantes por convenio_id
 * Usa la funcion DB search_chunks_by_convenio (I2.0b)
 */
export async function searchChunksByConvenio(
  _embedding: number[],
  _convenioId: string,
  _limit = 5
) {
  // TODO: I2.2 - Implementar con supabase.rpc()
  throw new Error('Not implemented - pending I2.2');
}

/**
 * Obtener perfil JSON de un convenio
 */
export async function getPerfilByConvenio(_convenioId: string) {
  // TODO: I2.2
  throw new Error('Not implemented - pending I2.2');
}

/**
 * Buscar en cache semantico
 */
export async function searchSemanticCache(
  _embedding: number[],
  _convenioId: string
) {
  // TODO: I2.2
  throw new Error('Not implemented - pending I2.2');
}

/**
 * Guardar respuesta en cache semantico
 */
export async function saveToSemanticCache(
  _embedding: number[],
  _query: string,
  _response: string,
  _convenioId: string
) {
  // TODO: I2.2
  throw new Error('Not implemented - pending I2.2');
}
