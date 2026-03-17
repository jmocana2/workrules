/**
 * Tipos locales para ChatPage
 *
 * Estos tipos son específicos del componente ChatPage.
 * Los tipos de dominio comunes están en @core/types
 */

import type { Convenio, ConversationSummary, PerfilJson } from "@core/types";
import type { UIMessage } from "ai";

// Re-exportar tipos de dominio que usamos
export type { Convenio, ConversationSummary, PerfilJson };

/**
 * Citación de fuente BOE
 */
export interface Citation {
  source: string;
  url: string;
  text?: string;
  articleNumber?: string;
}

/**
 * Mensaje de chat extendido con citaciones y content normalizado
 */
export interface ChatMessage extends Omit<UIMessage, "role"> {
  role: "user" | "assistant" | "system";
  /** Contenido del mensaje (extraído de parts para compatibilidad) */
  content: string;
  citations?: Citation[];
}

/**
 * Props del componente ChatPage
 */
export interface ChatPageProps {
  /** ID del convenio inicial (para deep linking) */
  initialConvenioId?: string;
  /** Mensajes iniciales (para rehidratar conversación) */
  initialMessages?: ChatMessage[];
  /** Convenios disponibles (mock para Storybook) */
  mockConvenios?: Convenio[];
  /** Perfil JSON mock (para Storybook) */
  mockPerfil?: PerfilJson | null;
  /** Conversaciones mock (para Storybook) */
  mockConversations?: ConversationSummary[];
  /** Plan del usuario mock (para Storybook) */
  mockUserPlan?: "free" | "premium";
  /** Clases CSS adicionales */
  className?: string;
}

/**
 * Estado interno del ChatPage
 */
export interface ChatPageState {
  /** Convenio actualmente seleccionado */
  selectedConvenio: Convenio | null;
  /** Perfil JSON del convenio seleccionado */
  perfilJson: PerfilJson | null;
  /** Si el panel de variables está colapsado */
  isVariablesPanelCollapsed: boolean;
  /** Si el sidebar está colapsado (mobile) */
  isSidebarCollapsed: boolean;
  /** Lista de conversaciones del historial */
  conversations: ConversationSummary[];
  /** ID de la conversación actual */
  currentConversationId: string | null;
}

/**
 * Return type del hook useChatPage
 */
export interface UseChatPageReturn {
  // Estado
  selectedConvenio: Convenio | null;
  perfilJson: PerfilJson | null;
  isVariablesPanelCollapsed: boolean;
  isSidebarCollapsed: boolean;
  conversations: ConversationSummary[];
  currentConversationId: string | null;
  messages: ChatMessage[];
  input: string;
  isLoading: boolean;
  error: Error | null;
  citations: Citation[];

  // Refs
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;

  // Handlers
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  handleSubmitFromText: (messageText: string) => Promise<void>;
  handleVariableClick: (variable: string, value: string) => void;
  selectConvenio: (convenio: Convenio) => void;
  clearConvenio: () => void;
  handleNewConversation: () => void;
  handleSelectConversation: (id: string) => void;
  handleOpenSettings: () => void;
  toggleVariablesPanel: () => void;
  toggleSidebar: () => void;
  setInput: (value: string) => void;
}
