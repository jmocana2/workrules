import { supabase } from "@/lib/supabase";
import type { UserConvenio } from "@core/types";
import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "./useSupabase";

export function useUserConvenios() {
  const { user } = useSupabase();
  const userId = user?.id ?? null;

  return useQuery({
    queryKey: ["user-convenios", userId],
    queryFn: async (): Promise<UserConvenio[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("convenios")
        .select("*")
        .eq("owner_id", userId)
        .eq("visibilidad", "privado")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data ?? []).map((row) => ({
        id: row.id,
        nombre: row.nombre,
        ambito: row.ambito ?? "",
        codigo_regcon: row.codigo_regcon ?? "",
        fecha_vigencia: row.fecha_vigencia?.toString() ?? "",
        url_pdf: row.url_pdf ?? "",
        estado: row.estado,
        visibilidad: row.visibilidad,
        owner_id: row.owner_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        userId,
        isPrivate: true,
        status: mapEstadoToStatus(row.estado),
        uploadedAt: row.created_at,
        errorMessage: row.error_message,
        isFavorite: false,
        sector: extractSectorFromNombre(row.nombre),
        vigente: row.estado !== "derogado",
      }));
    },
    staleTime: 30 * 1000,
    enabled: userId !== null,
  });
}

/**
 * Mapea el estado de la BD al status de UserConvenio
 */
function mapEstadoToStatus(
  estado: string
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

/**
 * Intenta extraer el sector del nombre del convenio
 * Por ejemplo: "Hosteleria Madrid" -> "Hosteleria"
 */
function extractSectorFromNombre(nombre: string): string {
  // Buscar palabras clave comunes
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
