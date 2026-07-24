// supabase/functions/_shared/infrastructure/supabase/perfil-repository.ts

import type { PerfilRepository } from "../../application/ports/perfil-repository.ts";
import { getPerfilByConvenio } from "../../lib/supabase.ts";

export const supabasePerfilRepository: PerfilRepository = {
  getByConvenio: (convenioId) => getPerfilByConvenio(convenioId),
};
