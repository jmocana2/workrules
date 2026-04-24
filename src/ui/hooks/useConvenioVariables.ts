import { supabase } from "@/lib/supabase";
import type { PerfilJson } from "@core/types";
import { useQuery } from "@tanstack/react-query";

/**
 * Hook para obtener las variables críticas de un convenio
 * @param convenioId - ID del convenio
 * @returns Query con el perfil JSON del convenio
 */
export function useConvenioVariables(convenioId: string | null) {
  return useQuery({
    queryKey: ["convenioVariables", convenioId],
    queryFn: async (): Promise<PerfilJson | null> => {
      console.log('[useConvenioVariables] Fetching for convenioId:', convenioId);
      if (!convenioId) return null;

      const { data, error } = await supabase
        .from("convenio_perfiles")
        .select("perfil_data")
        .eq("convenio_id", convenioId)
        .single();

      console.log('[useConvenioVariables] Result:', { data: !!data, error: error?.message });

      if (error) {
        // No profile found is not an error, just return null
        if (error.code === "PGRST116") return null;
        throw error;
      }

      const perfil = data?.perfil_data;
      if (!perfil) return null;

      // Transformar a formato PerfilJson
      return {
        convenio: perfil.convenio ?? "",
        variables_criticas: perfil.variables_criticas ?? [],
        valores_posibles: buildValoresPosibles(perfil),
        descripciones: perfil.descripciones ?? {},
      };
    },
    enabled: !!convenioId,
  });
}

/**
 * Construye el objeto valores_posibles desde el perfil
 * @param perfil - Datos del perfil desde la BD
 * @returns Objeto con los valores posibles de cada variable
 */
function buildValoresPosibles(perfil: any): Record<string, string[]> {
  const valores: Record<string, string[]> = {};

  // Si ya tiene valores_posibles, usarlos
  if (perfil.valores_posibles) {
    return perfil.valores_posibles;
  }

  // Intentar extraer desde variables_especificas primero
  if (perfil.variables_especificas) {
    const especificas = perfil.variables_especificas;

    // Mapeo de variables_criticas a campos en variables_especificas
    // Soporta tanto nombres con espacios/tildes como con guiones bajos
    const mapeoVariables: Record<string, string[]> = {
      "área funcional": ["area_funcional"],
      "tipo de contrato": ["tipo_contrato_area6", "modalidad_contrato"],
      "tipo_contrato": ["tipo_contrato_area6", "modalidad_contrato"],
      "tipo de establecimiento": ["tipo_establecimiento"],
      "tipo_establecimiento": ["tipo_establecimiento"],
      "nivel retributivo": ["nivel_retributivo"],
      "turnos": ["turnos"],
      "metodología captura datos": ["metodologia_captura_datos"],
    };

    Object.entries(mapeoVariables).forEach(
      ([variableCritica, posiblesCampos]) => {
        for (const campo of posiblesCampos) {
          if (especificas[campo] && Array.isArray(especificas[campo])) {
            valores[variableCritica] = especificas[campo];
            break; // Usar el primero que encuentre
          }
        }
      },
    );
  }

  // Extraer grupos profesionales únicos desde categorias_profesionales
  if (
    perfil.categorias_profesionales &&
    Array.isArray(perfil.categorias_profesionales)
  ) {
    const grupos = new Set<string>();
    perfil.categorias_profesionales.forEach((c: any) => {
      if (c.grupo && c.grupo !== "Ad personam") {
        grupos.add(`Grupo ${c.grupo}`);
      }
    });
    if (grupos.size > 0) {
      valores["grupo profesional"] = Array.from(grupos).sort();
      valores["grupo_profesional"] = Array.from(grupos).sort();
    }

    // Extraer niveles profesionales únicos
    const niveles = new Set<string>();
    perfil.categorias_profesionales.forEach((c: any) => {
      if (c.nivel && c.grupo !== "Ad personam") {
        niveles.add(`Nivel ${c.nivel}`);
      }
    });
    if (niveles.size > 0) {
      valores["nivel profesional"] = Array.from(niveles).sort();
      valores["nivel_profesional"] = Array.from(niveles).sort();
    }

    // Todas las categorías profesionales disponibles
    const categorias = perfil.categorias_profesionales
      .map((c: any) => c.nombre ?? c)
      .filter(Boolean);

    if (categorias.length > 0) {
      valores["categoria profesional"] = categorias;
      valores["categoria_profesional"] = categorias;
    }
  }

  // Antigüedad en años (rango típico 0-40)
  valores["antigüedad en años"] = Array.from(
    { length: 41 },
    (_, i) => i.toString(),
  );
  valores["antiguedad_empresa"] = Array.from(
    { length: 41 },
    (_, i) => i.toString(),
  );

  // Edad trabajador (rango 16-70)
  valores["edad trabajador"] = Array.from(
    { length: 55 },
    (_, i) => (i + 16).toString(),
  );
  valores["edad_trabajador"] = Array.from(
    { length: 55 },
    (_, i) => (i + 16).toString(),
  );

  // Jornada (completa/parcial)
  valores["jornada (completa/parcial)"] = ["completa", "parcial"];
  valores["jornada_laboral"] = ["completa", "parcial", "reducida"];

  // Trabajo a distancia regular (sí/no)
  valores["trabajo a distancia regular"] = ["sí", "no"];

  // Horas nocturnas (0-12)
  valores["horas nocturnas"] = Array.from(
    { length: 13 },
    (_, i) => i.toString(),
  );
  valores["horas_nocturnas"] = Array.from(
    { length: 13 },
    (_, i) => i.toString(),
  );

  // Días festivos trabajados (0-14)
  valores["dias festivos trabajados"] = Array.from(
    { length: 15 },
    (_, i) => i.toString(),
  );
  valores["dias_festivos_trabajados"] = Array.from(
    { length: 15 },
    (_, i) => i.toString(),
  );

  // Extraer tipos de establecimiento desde mapeo_establecimientos
  if (perfil.mapeo_establecimientos) {
    const establecimientos = Object.keys(perfil.mapeo_establecimientos);
    valores["tipo de establecimiento"] = establecimientos;
    valores["tipo_establecimiento"] = establecimientos;
  }

  return valores;
}
