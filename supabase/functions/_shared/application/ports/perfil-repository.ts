// supabase/functions/_shared/application/ports/perfil-repository.ts

/**
 * Repositorio del perfil declarativo asociado a un convenio.
 *
 * El perfil es un JSON abierto (estructura variable por convenio); se expone
 * como `Record<string, unknown>` porque la capa de aplicación lo consume así.
 */
export interface PerfilRepository {
  getByConvenio(convenioId: string): Promise<Record<string, unknown> | null>;
}
