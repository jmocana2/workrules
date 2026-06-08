import type { Convenio, UserConvenio, PerfilJson } from "@core/types";

/**
 * Filtros para listar convenios. La capa de aplicacion expresa intencion;
 * el adaptador traduce a la query concreta del backend.
 */
export interface ListConveniosFilters {
  searchTerm?: string;
  authenticatedUserId?: string | null;
}

/**
 * Puerto del catalogo de convenios. La aplicacion habla con esto;
 * cualquier backend (Supabase, REST, GraphQL, in-memory) puede implementarlo.
 */
export interface IConvenioRepository {
  /** Detalle de un convenio por id. Devuelve `null` si no existe. */
  getById(id: string): Promise<Convenio | null>;

  /**
   * Lista convenios visibles (publicos activos + privados del usuario si lo hay).
   * El filtro de busqueda se aplica sobre el nombre.
   */
  list(filters: ListConveniosFilters): Promise<Convenio[]>;

  /** Convenios privados del usuario, en cualquier estado salvo rechazado/error. */
  listOwnedByUser(userId: string): Promise<UserConvenio[]>;

  /** Perfil JSON con variables criticas y valores posibles de un convenio. */
  getPerfil(convenioId: string): Promise<PerfilJson | null>;

  /** Devuelve una URL firmada para abrir el PDF oficial del convenio. */
  getSignedPdfUrl(convenioId: string): Promise<string | null>;
}
