import { supabase } from "@/lib/supabase";
import type { Convenio } from "@core/types";
import { useQuery } from "@tanstack/react-query";

/**
 * Hook para obtener la lista de convenios disponibles para el usuario
 * Incluye:
 * - Convenios públicos activos (visibles para todos)
 * - Convenios privados del usuario autenticado (en cualquier estado)
 *
 * @param searchTerm - Término de búsqueda opcional para filtrar por nombre
 * @returns Query con la lista de convenios
 */
export function useConvenios(searchTerm?: string) {
  return useQuery({
    queryKey: ["convenios", searchTerm],
    queryFn: async (): Promise<Convenio[]> => {
      // Obtener el usuario actual
      const { data: { user } } = await supabase.auth.getUser();

      // Construir query base
      let query = supabase
        .from("convenios")
        .select(
          "id, nombre, nombre_oficial, nombre_corto, ambito, ambito_territorial, codigo_regcon, fecha_vigencia, url_pdf, estado, visibilidad, owner_id, created_at, updated_at",
        );

      // Filtrar convenios:
      // - Públicos activos: visibilidad='publico' AND estado='activo'
      // - Privados del usuario: owner_id=user.id (RLS se encarga de esto)
      // La política RLS ya filtra automáticamente, solo mostramos activos para públicos
      if (user) {
        // 'activo_sin_perfil' es chateable (chunks indexados) pero deshabilita calculadora salarial.
        query = query
          .or(
            `and(visibilidad.eq.publico,estado.in.(activo,activo_sin_perfil)),owner_id.eq.${user.id}`,
          )
          .not("estado", "in", "(rechazado,error)");
      } else {
        query = query
          .in("estado", ["activo", "activo_sin_perfil"])
          .eq("visibilidad", "publico");
      }

      // Aplicar filtro de búsqueda si existe
      if (searchTerm && searchTerm.trim().length > 0) {
        query = query.ilike("nombre", `%${searchTerm}%`);
      }

      // Ordenar por nombre
      query = query.order("nombre");

      const { data, error } = await query;

      if (error) throw error;

      return (data ?? []).map((row) => ({
        id: row.id,
        nombre: row.nombre,
        nombre_oficial: row.nombre_oficial ?? null,
        nombre_corto: row.nombre_corto ?? null,
        ambito: row.ambito ?? "",
        ambito_territorial: row.ambito_territorial ?? null,
        codigo_regcon: row.codigo_regcon ?? "",
        fecha_vigencia: row.fecha_vigencia?.toString() ?? "",
        url_pdf: row.url_pdf ?? "",
        estado: row.estado,
        visibilidad: row.visibilidad,
        owner_id: row.owner_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}
