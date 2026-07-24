// supabase/functions/_shared/application/ports/quota-service.ts

import type { QuotaStatus } from "./dtos.ts";

/** Servicio de cuota de consultas por usuario. */
export interface QuotaService {
  check(userId: string): Promise<QuotaStatus>;
  /** Incrementa el contador. Devuelve `true` si aún queda cuota. */
  increment(userId: string): Promise<boolean>;
}
