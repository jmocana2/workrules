import type { SupabaseClient } from "@supabase/supabase-js";
import type { Convenio, PerfilJson, UserConvenio } from "@core/types";
import type {
  IConvenioRepository,
  ListConveniosFilters,
} from "@/application/ports";

const CONVENIO_COLUMNS =
  "id, nombre, nombre_oficial, nombre_corto, ambito, ambito_territorial, codigo_regcon, fecha_vigencia, url_pdf, estado, visibilidad, owner_id, created_at, updated_at";

/**
 * Adaptador Supabase del puerto IConvenioRepository.
 * Toda la lógica de Supabase para convenios vive aqui: queries, joins,
 * filtros y mapeo de filas a entidades de dominio.
 */
export class SupabaseConvenioRepository implements IConvenioRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getById(id: string): Promise<Convenio | null> {
    const { data, error } = await this.client
      .from("convenios")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data as Convenio;
  }

  async list(filters: ListConveniosFilters): Promise<Convenio[]> {
    let query = this.client.from("convenios").select(CONVENIO_COLUMNS);

    // 'activo_sin_perfil' es chateable (chunks indexados) pero deshabilita
    // calculadora salarial. Lo incluimos en la lista para que se pueda chatear.
    if (filters.authenticatedUserId) {
      query = query
        .or(
          `and(visibilidad.eq.publico,estado.in.(activo,activo_sin_perfil)),owner_id.eq.${filters.authenticatedUserId}`,
        )
        .not("estado", "in", "(rechazado,error)");
    } else {
      query = query
        .in("estado", ["activo", "activo_sin_perfil"])
        .eq("visibilidad", "publico");
    }

    if (filters.searchTerm && filters.searchTerm.trim().length > 0) {
      query = query.ilike("nombre", `%${filters.searchTerm}%`);
    }

    query = query.order("nombre");

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).map(mapRowToConvenio);
  }

  async listOwnedByUser(userId: string): Promise<UserConvenio[]> {
    const { data, error } = await this.client
      .from("convenios")
      .select("*")
      .eq("owner_id", userId)
      .eq("visibilidad", "privado")
      .not("estado", "in", "(rechazado,error)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data ?? []).map((row) => ({
      ...mapRowToConvenio(row),
      userId,
      isPrivate: true,
      status: mapEstadoToStatus(row.estado),
      uploadedAt: row.created_at,
      errorMessage: row.error_message,
      isFavorite: false,
      sector: extractSectorFromNombre(row.nombre),
      vigente: row.estado !== "derogado",
    }));
  }

  async getPerfil(convenioId: string): Promise<PerfilJson | null> {
    const { data, error } = await this.client
      .from("convenio_perfiles")
      .select("perfil_data")
      .eq("convenio_id", convenioId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    const perfil = data?.perfil_data;
    if (!perfil) return null;

    return {
      convenio: perfil.convenio ?? "",
      variables_criticas: perfil.variables_criticas ?? [],
      valores_posibles: buildValoresPosibles(perfil),
      descripciones: perfil.descripciones ?? {},
    };
  }

  async getSignedPdfUrl(convenioId: string): Promise<string | null> {
    const { data, error } = await this.client.functions.invoke("sign-pdf", {
      body: { convenio_id: convenioId },
    });
    if (error || !data?.url) return null;
    return data.url as string;
  }
}

// ============================================================================
// Mapeo y transformaciones (privadas al adaptador)
// ============================================================================

function mapRowToConvenio(row: Record<string, unknown>): Convenio {
  return {
    id: row.id as string,
    nombre: row.nombre as string,
    nombre_oficial: (row.nombre_oficial as string | null) ?? null,
    nombre_corto: (row.nombre_corto as string | null) ?? null,
    ambito: (row.ambito as string | null) ?? "",
    ambito_territorial: (row.ambito_territorial as string | null) ?? null,
    codigo_regcon: (row.codigo_regcon as string | null) ?? "",
    fecha_vigencia: row.fecha_vigencia?.toString() ?? "",
    url_pdf: (row.url_pdf as string | null) ?? "",
    estado: row.estado as Convenio["estado"],
    visibilidad: row.visibilidad as Convenio["visibilidad"],
    owner_id: (row.owner_id as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function mapEstadoToStatus(
  estado: string,
): "pending" | "processing" | "ready" | "error" {
  switch (estado) {
    case "pendiente":
      return "pending";
    case "procesando":
      return "processing";
    case "activo":
      return "ready";
    case "error":
      return "error";
    default:
      return "pending";
  }
}

function extractSectorFromNombre(nombre: string): string {
  const sectores = [
    "Hosteleria",
    "Comercio",
    "Construcción",
    "Construccion",
    "Metalurgia",
    "Industria",
    "Servicios",
    "Transporte",
    "Sanidad",
    "Educación",
    "Educacion",
  ];
  for (const sector of sectores) {
    if (nombre.toLowerCase().includes(sector.toLowerCase())) {
      return sector;
    }
  }
  return "Otros";
}

// ----------------------------------------------------------------------------
// buildValoresPosibles: extrae valores posibles del perfil JSON.
// Lógica trasladada tal cual desde el antiguo useConvenioVariables.
// ----------------------------------------------------------------------------

interface RawPerfil {
  valores_posibles?: Record<string, string[]>;
  variables_especificas?: Record<string, string[] | undefined>;
  categorias_profesionales?: Array<
    { grupo?: string; nivel?: string; nombre?: string } | string
  >;
  mapeo_establecimientos?: Record<string, unknown>;
}

function buildValoresPosibles(perfil: RawPerfil): Record<string, string[]> {
  const valores: Record<string, string[]> = {};

  if (perfil.valores_posibles) {
    return perfil.valores_posibles;
  }

  if (perfil.variables_especificas) {
    const especificas = perfil.variables_especificas;
    const mapeoVariables: Record<string, string[]> = {
      "área funcional": ["area_funcional"],
      "tipo de contrato": ["tipo_contrato_area6", "modalidad_contrato"],
      tipo_contrato: ["tipo_contrato_area6", "modalidad_contrato"],
      "tipo de establecimiento": ["tipo_establecimiento"],
      tipo_establecimiento: ["tipo_establecimiento"],
      "nivel retributivo": ["nivel_retributivo"],
      turnos: ["turnos"],
      "metodología captura datos": ["metodologia_captura_datos"],
    };

    Object.entries(mapeoVariables).forEach(
      ([variableCritica, posiblesCampos]) => {
        for (const campo of posiblesCampos) {
          const value = especificas[campo];
          if (value && Array.isArray(value)) {
            valores[variableCritica] = value;
            break;
          }
        }
      },
    );
  }

  if (
    perfil.categorias_profesionales &&
    Array.isArray(perfil.categorias_profesionales)
  ) {
    const categoriasObj = perfil.categorias_profesionales.filter(
      (c): c is { grupo?: string; nivel?: string; nombre?: string } =>
        typeof c === "object" && c !== null,
    );

    const grupos = new Set<string>();
    categoriasObj.forEach((c) => {
      if (c.grupo && c.grupo !== "Ad personam") {
        grupos.add(`Grupo ${c.grupo}`);
      }
    });
    if (grupos.size > 0) {
      valores["grupo profesional"] = Array.from(grupos).sort();
      valores.grupo_profesional = Array.from(grupos).sort();
    }

    const niveles = new Set<string>();
    categoriasObj.forEach((c) => {
      if (c.nivel && c.grupo !== "Ad personam") {
        niveles.add(`Nivel ${c.nivel}`);
      }
    });
    if (niveles.size > 0) {
      valores["nivel profesional"] = Array.from(niveles).sort();
      valores.nivel_profesional = Array.from(niveles).sort();
    }

    const categorias = perfil.categorias_profesionales
      .map((c) => (typeof c === "string" ? c : c.nombre))
      .filter((c): c is string => Boolean(c));

    if (categorias.length > 0) {
      valores["categoria profesional"] = categorias;
      valores.categoria_profesional = categorias;
    }
  }

  valores["antigüedad en años"] = Array.from({ length: 41 }, (_, i) =>
    i.toString(),
  );
  valores.antiguedad_empresa = Array.from({ length: 41 }, (_, i) =>
    i.toString(),
  );

  valores["edad trabajador"] = Array.from({ length: 55 }, (_, i) =>
    (i + 16).toString(),
  );
  valores.edad_trabajador = Array.from({ length: 55 }, (_, i) =>
    (i + 16).toString(),
  );

  valores["jornada (completa/parcial)"] = ["completa", "parcial"];
  valores.jornada_laboral = ["completa", "parcial", "reducida"];

  valores["trabajo a distancia regular"] = ["sí", "no"];

  valores["horas nocturnas"] = Array.from({ length: 13 }, (_, i) =>
    i.toString(),
  );
  valores.horas_nocturnas = Array.from({ length: 13 }, (_, i) => i.toString());

  valores["dias festivos trabajados"] = Array.from({ length: 15 }, (_, i) =>
    i.toString(),
  );
  valores.dias_festivos_trabajados = Array.from({ length: 15 }, (_, i) =>
    i.toString(),
  );

  if (perfil.mapeo_establecimientos) {
    const establecimientos = Object.keys(perfil.mapeo_establecimientos);
    valores["tipo de establecimiento"] = establecimientos;
    valores.tipo_establecimiento = establecimientos;
  }

  return valores;
}
