// supabase/functions/_shared/infrastructure/supabase/quota-service.ts

import type { QuotaService } from "../../application/ports/quota-service.ts";
import { checkUserQuota, incrementQueryCount } from "../../lib/supabase.ts";

export const supabaseQuotaService: QuotaService = {
  check: (userId) => checkUserQuota(userId),
  increment: (userId) => incrementQueryCount(userId),
};
