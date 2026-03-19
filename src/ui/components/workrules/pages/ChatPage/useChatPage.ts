/**
 * useChatPage - Hook de estado y lógica para ChatPage
 *
 * Maneja:
 * - Estado del convenio seleccionado
 * - Integración con useChat del AI SDK
 * - Parseo de citaciones
 * - Panel de variables
 * - Historial de conversaciones
 */

import { useChat } from "@ai-sdk/react";
import {
  MOCK_CHAT_MESSAGES,
  MOCK_CONVENIOS,
  MOCK_CONVERSATIONS,
  MOCK_PERFIL_HOSTELERIA,
} from "@mocks/data/convenios";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AlertState,
  ChatMessage,
  ChatPageState,
  Citation,
  ConflictOption,
  Convenio,
  ConversationSummary,
  PerfilJson,
  UseChatPageReturn,
} from "./ChatPage.types";
import { clearAlertState, createInitialAlertState } from "./parseAlertEvent";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";

interface UseChatPageOptions {
  initialConvenioId?: string;
  initialMessages?: ChatMessage[];
  mockConvenios?: Convenio[];
  mockPerfil?: PerfilJson | null;
  mockConversations?: ConversationSummary[];
}

export function useChatPage(
  options: UseChatPageOptions = {},
): UseChatPageReturn {
  const {
    initialConvenioId,
    mockConvenios = MOCK_CONVENIOS,
    mockPerfil,
    mockConversations = MOCK_CONVERSATIONS,
  } = options;

  const getMessageText = useCallback((message: UIMessage): string => {
    // Intentar obtener content legacy
    const legacyContent = (message as { content?: unknown }).content;
    if (typeof legacyContent === "string" && legacyContent.length > 0) {
      return legacyContent;
    }

    // Extraer de parts
    return message.parts
      .filter((part): part is { type: "text"; text: string } =>
        part.type === "text"
      )
      .map((part) => part.text)
      .join("\n");
  }, []);

  // Refs
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Estado local
  const [state, setState] = useState<ChatPageState>({
    selectedConvenio: null,
    perfilJson: mockPerfil || null,
    isVariablesPanelCollapsed: false,
    isSidebarCollapsed: false,
    conversations: mockConversations,
    currentConversationId: null,
  });

  // Citaciones parseadas del stream
  const [citations, setCitations] = useState<Citation[]>([]);

  // Estado de alertas del protocolo (Estados D, E, F)
  const [alertState, setAlertState] = useState<AlertState>(
    createInitialAlertState(),
  );

  // Input controlado localmente
  const [localInput, setLocalInput] = useState("");

  // useChat del AI SDK (nueva API)
  const {
    messages: aiMessages,
    sendMessage,
    status,
    error,
    setMessages,
  } = useChat({
    transport: new DefaultChatTransport({
      api: SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/chat` : "/api/chat",
    }),
  });

  // Convertir mensajes de AI SDK a nuestro tipo
  const messages: ChatMessage[] = useMemo(
    () =>
      aiMessages.map((msg) => {
        const content = getMessageText(msg);
        return {
          ...msg,
          content,
          role: msg.role as "user" | "assistant" | "system",
        };
      }),
    [aiMessages, getMessageText],
  );

  const isLoading = status === "streaming" || status === "submitted";

  // Parsear citaciones cuando termina el streaming
  useEffect(() => {
    if (status === "ready" && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "assistant") {
        // Parsear citaciones del mensaje (formato markdown: [texto](url))
        // Regex optimizada para evitar backtracking
        const citationMatches = lastMessage.content.matchAll(
          /\[([^\]]{1,200})\]\(([^)\s]{1,500})\)/g,
        );
        const parsedCitations: Citation[] = [];
        for (const match of citationMatches) {
          parsedCitations.push({
            source: match[1],
            url: match[2],
          });
        }
        if (parsedCitations.length > 0) {
          setCitations(parsedCitations);
        }
      }
    }
  }, [status, messages]);

  // Cargar convenio inicial
  useEffect(() => {
    if (initialConvenioId) {
      const convenio = mockConvenios.find((c) => c.id === initialConvenioId);
      if (convenio) {
        setState((prev) => ({
          ...prev,
          selectedConvenio: convenio,
          perfilJson: MOCK_PERFIL_HOSTELERIA,
        }));
      }
    }
  }, [initialConvenioId, mockConvenios]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Seleccionar convenio
  const selectConvenio = useCallback((convenio: Convenio) => {
    setState((prev) => ({ ...prev, selectedConvenio: convenio }));

    // En producción, aquí se haría fetch del perfil desde el backend
    setState((prev) => ({ ...prev, perfilJson: MOCK_PERFIL_HOSTELERIA }));
  }, []);

  // Limpiar convenio
  const clearConvenio = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedConvenio: null,
      perfilJson: null,
    }));
    setMessages([]);
    setCitations([]);
    setLocalInput("");
  }, [setMessages]);

  // Click en variable del panel
  const handleVariableClick = useCallback(
    (variable: string, value: string) => {
      const textToInsert = `${variable}: ${value}`;
      const textarea = inputRef.current;

      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentValue = textarea.value;

        const newValue = currentValue.substring(0, start) +
          textToInsert +
          currentValue.substring(end);

        setLocalInput(newValue);

        // Restaurar foco y posición del cursor
        setTimeout(() => {
          textarea.focus();
          const newPosition = start + textToInsert.length;
          textarea.setSelectionRange(newPosition, newPosition);
        }, 0);
      } else {
        // Sin ref, simplemente añadir al final
        const newValue = localInput
          ? `${localInput} ${textToInsert}`
          : textToInsert;
        setLocalInput(newValue);
      }
    },
    [localInput],
  );

  // Manejar cambio de input
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setLocalInput(e.target.value);
    },
    [],
  );

  // Submit directo desde texto para evitar dependencia de estado asíncrono
  const handleSubmitFromText = useCallback(
    async (messageText: string) => {
      if (!state.selectedConvenio) {
        return;
      }

      const text = messageText.trim();
      if (!text) {
        return;
      }

      // Reset citaciones y alertas al enviar nuevo mensaje
      setCitations([]);
      setAlertState(clearAlertState());

      await sendMessage({ text });
      setLocalInput("");
    },
    [state.selectedConvenio, sendMessage],
  );

  // Submit con evento de formulario
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      await handleSubmitFromText(localInput);
    },
    [localInput, handleSubmitFromText],
  );

  // Nueva conversación
  const handleNewConversation = useCallback(() => {
    setMessages([]);
    setCitations([]);
    setLocalInput("");
    setState((prev) => ({
      ...prev,
      currentConversationId: null,
      selectedConvenio: null,
      perfilJson: null,
    }));
  }, [setMessages]);

  // Seleccionar conversación del historial
  const handleSelectConversation = useCallback(
    (id: string) => {
      setState((prev) => ({ ...prev, currentConversationId: id }));
      // En producción, aquí se cargarían los mensajes de la conversación desde el backend
      const mockMessages: ChatMessage[] = MOCK_CHAT_MESSAGES.map((msg) => ({
        ...msg,
        role: msg.role as "user" | "assistant" | "system",
        parts: [{ type: "text" as const, text: msg.content }],
      }));
      setMessages(mockMessages);
    },
    [setMessages],
  );

  // Abrir configuración
  const handleOpenSettings = useCallback(() => {
    console.log("Abrir configuración");
  }, []);

  // Toggle panel de variables
  const toggleVariablesPanel = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isVariablesPanelCollapsed: !prev.isVariablesPanelCollapsed,
    }));
  }, []);

  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isSidebarCollapsed: !prev.isSidebarCollapsed,
    }));
  }, []);

  // Setter para input
  const setInput = useCallback((value: string) => {
    setLocalInput(value);
  }, []);

  // ============================================================================
  // Handlers de alertas del protocolo
  // ============================================================================

  /**
   * Descartar la alerta actual
   */
  const handleAlertDismiss = useCallback(() => {
    setAlertState(clearAlertState());
  }, []);

  /**
   * Seleccionar una sugerencia de AlertInvalidData
   * Inserta el texto sugerido en el input y cierra la alerta
   */
  const handleInvalidDataSuggestion = useCallback(
    (suggestion: string) => {
      setLocalInput(suggestion);
      setAlertState(clearAlertState());
      inputRef.current?.focus();
    },
    [],
  );

  /**
   * Seleccionar una opción de AlertConflict
   * Envía un mensaje con la opción seleccionada y cierra la alerta
   */
  const handleConflictOption = useCallback(
    async (option: ConflictOption) => {
      // Enviar mensaje con la opción seleccionada
      await sendMessage({ text: `Mi respuesta es: ${option.label}` });
      setAlertState(clearAlertState());
    },
    [sendMessage, setAlertState],
  );

  /**
   * Ver detalles del SMI
   * Por ahora solo loguea, se puede expandir para mostrar modal o scroll a detalles
   */
  const handleSMIViewDetails = useCallback(() => {
    // TODO: Implementar visualización de detalles SMI
    console.log("Ver detalles SMI:", alertState.payload);
  }, [alertState.payload]);

  /**
   * Función para establecer alerta manualmente (útil para mocks/testing)
   */
  const setAlert = useCallback((newAlertState: AlertState) => {
    setAlertState(newAlertState);
  }, []);

  return {
    // Estado
    ...state,
    messages,
    input: localInput,
    isLoading,
    error: error || null,
    citations,

    // Estado de alertas
    alertState,

    // Refs
    inputRef,
    messagesEndRef,

    // Handlers
    handleInputChange,
    handleSubmit,
    handleSubmitFromText,
    handleVariableClick,
    selectConvenio,
    clearConvenio,
    handleNewConversation,
    handleSelectConversation,
    handleOpenSettings,
    toggleVariablesPanel,
    toggleSidebar,
    setInput,

    // Handlers de alertas
    handleAlertDismiss,
    handleInvalidDataSuggestion,
    handleConflictOption,
    handleSMIViewDetails,

    // Util para testing/mocks
    setAlert,
  };
}
