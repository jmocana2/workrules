// supabase/functions/_shared/application/ports/embedding-client.ts

/** Cliente de embeddings vectoriales. */
export interface EmbeddingClient {
  embed(text: string): Promise<number[]>;
}
