// supabase/functions/_shared/infrastructure/supabase/convenio-repository.ts

import type { ConvenioRepository } from "../../application/ports/convenio-repository.ts";
import type { ConvenioSummary } from "../../application/ports/dtos.ts";
import type { Convenio as DbConvenio } from "../../lib/supabase.ts";
import { getConvenioById } from "../../lib/supabase.ts";

const mapConvenio = (row: DbConvenio): ConvenioSummary => ({
  id: row.id,
  nombre: row.nombre,
  nombreOficial: row.nombre_oficial ?? null,
  nombreCorto: row.nombre_corto ?? null,
  codigoRegcon: row.codigo_regcon,
  ambito: row.ambito,
  ambitoTerritorial: row.ambito_territorial ?? null,
  fechaVigencia: row.fecha_vigencia,
  estado: row.estado,
  urlPdf: row.url_pdf ?? null,
});

export const supabaseConvenioRepository: ConvenioRepository = {
  async getById(convenioId) {
    const row = await getConvenioById(convenioId);
    return row ? mapConvenio(row) : null;
  },
};
