/** Chunk de un convenio almacenado en convenio_chunks */
export interface ConvenioChunk {
  id: string;
  convenio_id: string;
  contenido: string;
  embedding: number[] | null;
  metadata: ChunkMetadata;
  created_at: string;
}

export interface ChunkMetadata {
  seccion: string | null;
  articulo: string | null;
  tipo:
    | 'normativa'
    | 'tabla_salarial'
    | 'tabla'
    | 'definicion'
    | 'procedimiento'
    | 'jornada'
    | 'sanciones';
  tokens: number;
  numero_chunk: number;
  total_chunks: number;
  tiene_tabla: boolean;
  convenio_nombre: string;
}

/** Perfil JSON extraido por Claude en el indexer */
export interface ConvenioPerfil {
  id: string;
  convenio_id: string;
  perfil: PerfilJSON;
  created_at: string;
}

/** Estructura del perfil JSON (schema simplificado) */
export interface PerfilJSON {
  nombre_convenio: string;
  ambito: string;
  vigencia: {
    inicio: string;
    fin: string;
  };
  categorias_profesionales: CategoriaLaboral[];
  jornada: {
    horas_anuales: number | null;
    horas_semanales: number | null;
  };
  variables_criticas: string[];
  [key: string]: unknown; // Campos adicionales segun convenio
}

export interface CategoriaLaboral {
  nombre: string;
  grupo: string | null;
  salario_base: number | null;
  complementos?: Record<string, number>;
}
