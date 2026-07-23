// supabase/functions/_shared/application/ports/convenio-repository.ts

import type { ConvenioSummary } from "./dtos.ts";

/** Repositorio de convenios colectivos. */
export interface ConvenioRepository {
  getById(convenioId: string): Promise<ConvenioSummary | null>;
}
