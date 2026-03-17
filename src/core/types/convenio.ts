import type { Convenio } from './supabase';

export interface PerfilJson {
  convenio: string;
  variables_criticas: string[];
  valores_posibles: Record<string, string[]>;
  descripciones?: Record<string, string>;
}

export interface UserConvenio extends Convenio {
  userId: string;
  isPrivate: boolean;
  status: 'pending' | 'processing' | 'ready' | 'error';
  uploadedAt: string;
  errorMessage?: string;
  isFavorite?: boolean;
  // Campos adicionales para UI
  sector?: string;
  vigente?: boolean;
}

export interface ConversationSummary {
  id: string;
  title: string;
  convenioId: string;
  convenioNombre: string;
  lastMessageAt: string;
  preview: string;
}
