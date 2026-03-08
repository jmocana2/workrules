// ============================================
// Tipos de Supabase - WorkRules
// ============================================
// Tipos basicos para las tablas principales
// Generados manualmente. Para tipos completos usar:
// pnpm supabase gen types typescript --project-id kvebuijpjwlgrnfwfdgk

// ============================================
// Convenios
// ============================================

export type AmbitoConvenio = 'estatal' | 'provincial' | 'empresa';

export interface Convenio {
  id: string;
  nombre: string;
  ambito: AmbitoConvenio;
  codigo_boe: string;
  url_boe?: string;
  fecha_publicacion?: string;
  fecha_vigencia_inicio?: string;
  fecha_vigencia_fin?: string;
  created_at: string;
  updated_at: string;
}

export interface PerfilConvenio {
  id: string;
  convenio_id: string;
  variables_criticas: string[];
  valores_posibles: Record<string, string[]>;
  categorias_profesionales?: CategoriasProfesionales;
  tabla_salarial?: TablaSalarial;
  created_at: string;
  updated_at: string;
}

export interface CategoriasProfesionales {
  grupos?: string[];
  niveles?: string[];
  areas?: string[];
}

export interface TablaSalarial {
  anio: number;
  salarios: Record<string, number>;
  complementos?: Record<string, number>;
}

// ============================================
// Chunks (RAG)
// ============================================

export interface ConvenioChunk {
  id: string;
  convenio_id: string;
  content: string;
  embedding: number[];
  metadata?: ChunkMetadata;
  created_at: string;
}

export interface ChunkMetadata {
  articulo?: string;
  seccion?: string;
  pagina?: number;
  tipo?: 'texto' | 'tabla' | 'anexo';
}

// ============================================
// Chat
// ============================================

export interface ChatSession {
  id: string;
  user_id: string;
  convenio_id: string;
  created_at: string;
  updated_at: string;
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  session_id: string;
  role: MessageRole;
  content: string;
  metadata?: MessageMetadata;
  created_at: string;
}

export interface MessageMetadata {
  tokens_used?: number;
  cached?: boolean;
  citations?: Citation[];
}

export interface Citation {
  article: string;
  url: string;
  snippet?: string;
}

// ============================================
// Usuarios y Cuotas
// ============================================

export type PlanTipo = 'free' | 'premium' | 'enterprise';

export interface UserQuota {
  user_id: string;
  plan: PlanTipo;
  queries_used: number;
  queries_limit: number;
  reset_at: string;
}

// ============================================
// Cache Semantico
// ============================================

export interface SemanticCache {
  id: string;
  convenio_id: string;
  question_hash: string;
  question: string;
  answer: string;
  embedding: number[];
  hit_count: number;
  created_at: string;
  expires_at: string;
}
