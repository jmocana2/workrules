/**
 * useChatPage - Hook de estado y lógica para ChatPage
 *
 * Maneja:
 * - Estado del convenio seleccionado
 * - Integración con useChat del AI SDK (mock) o useChatStream (API real)
 * - Parseo de citaciones
 * - Panel de variables
 * - Historial de conversaciones
 * - Estados especiales del protocolo (incomplete, invalid, smi_alert, conflicting)
 */

import {
  createChatSession,
  getConvenioById,
  getConvenioIdForSession,
  loadChatSessionMessages,
} from "@/application/use-cases";
import { useRepositories } from "@/providers/RepositoriesProvider";
import { useChat } from "@ai-sdk/react";
import { useChatSessions } from "@ui/hooks/useChatSessions";
import { useChatStream } from "@ui/hooks/useChatStream";
import { useConvenioVariables } from "@ui/hooks/useConvenioVariables";
import { useSupabase } from "@ui/hooks/useSupabase";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ChatMessage,
  ChatPageState,
  Citation,
  Convenio,
  ConversationSummary,
  PerfilJson,
  UseChatPageReturn,
} from "./ChatPage.types";
import { useVariableChips } from "./hooks/useVariableChips";
import {
  type ProtocolSendMessage,
  useProtocolState,
} from "./hooks/useProtocolState";
import { humanizeVariableLabel } from "./helpers/variableClassification";
import { buildSyntheticPrompt } from "./helpers/syntheticPrompt";
import {
  buildPdfHref,
  getMessageText,
} from "./helpers/messageAdapters";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";

/** Flag para usar mocks en desarrollo/Storybook */
const USE_MOCK_API = import.meta.env.VITE_USE_MOCKS === "true";

interface UseChatPageOptions {
  initialConvenioId?: string;
  initialMessages?: ChatMessage[];
  mockConvenios?: Convenio[];
  mockPerfil?: PerfilJson | null;
  mockConversations?: ConversationSummary[];
  /** Forzar uso de mocks (util para Storybook) */
  useMocks?: boolean;
}

export function useChatPage(
  options: UseChatPageOptions = {},
): UseChatPageReturn {
  const {
    initialConvenioId,
    mockConvenios,
    mockPerfil,
    mockConversations,
    useMocks = USE_MOCK_API,
  } = options;

  // ============================================================================
  // Hooks de data fetching (TFM.3)
  // ============================================================================
  const { user } = useSupabase();
  const { chatSession: chatSessionRepo, convenio: convenioRepo } =
    useRepositories();
  const { data: realConversations } = useChatSessions(
    useMocks ? null : user?.id ?? null,
  );

  // Estado local para convenio seleccionado (necesario para el hook de variables)
  const [selectedConvenioId, setSelectedConvenioId] = useState<string | null>(
    initialConvenioId ?? null,
  );

  const { data: realPerfilJson } = useConvenioVariables(
    useMocks ? null : selectedConvenioId,
  );

  // Refs
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Estado local
  const shouldUseMocks = useMocks;
  const [state, setState] = useState<ChatPageState>({
    selectedConvenio: null,
    perfilJson: shouldUseMocks ? (mockPerfil || null) : null,
    isVariablesPanelCollapsed: false,
    isSidebarCollapsed: false,
    conversations: shouldUseMocks ? (mockConversations ?? []) : [],
    currentConversationId: null,
  });

  // Estado para session_id (se crea automáticamente al enviar el primer mensaje)
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Actualizar conversaciones cuando lleguen datos reales
  useEffect(() => {
    if (!shouldUseMocks && realConversations !== undefined) {
      setState((prev) => ({ ...prev, conversations: realConversations }));
    }
  }, [shouldUseMocks, realConversations]);

  // Actualizar perfil cuando lleguen datos reales o cambie el convenio
  useEffect(() => {
    if (!shouldUseMocks && realPerfilJson !== undefined) {
      setState((prev) => ({ ...prev, perfilJson: realPerfilJson }));
    }
  }, [shouldUseMocks, realPerfilJson]);

  // Citaciones parseadas del stream (para modo mock)
  const [mockCitations, setMockCitations] = useState<Citation[]>([]);

  // Input controlado localmente
  const [localInput, setLocalInput] = useState("");

  const {
    activeVariables,
    hasIdentifyingVariables,
    handleVariableClick,
    handleVariableRemove,
    mergeResolvedVariables,
    clear: clearActiveVariables,
  } = useVariableChips();

  const [salaryMode, setSalaryMode] = useState(false);

  /**
   * Sender unificado que abstrae real/mock. Se asigna en un efecto tras
   * instanciar ambos hooks de chat y se consume desde `useProtocolState`
   * vía un callback estable que lee la ref.
   */
  const sendMessageRef = useRef<ProtocolSendMessage>(async () => {});
  const messagesRef = useRef<ChatMessage[]>([]);
  const activeVariablesRef = useRef<Record<string, string>>({});
  activeVariablesRef.current = activeVariables;

  const stableSendMessage = useCallback<ProtocolSendMessage>(
    async (text, opts) => sendMessageRef.current(text, opts),
    [],
  );
  const getMessages = useCallback(() => messagesRef.current, []);
  const getActiveVariables = useCallback(() => activeVariablesRef.current, []);
  const onInvalidDataSuggestion = useCallback((suggestion: string) => {
    setLocalInput(suggestion);
    inputRef.current?.focus();
  }, []);

  const {
    alertState,
    dataRequestState,
    handleSpecialState,
    clearProtocol,
    handleAlertDismiss,
    handleInvalidDataSuggestion,
    handleConflictOption,
    handleSMIViewDetails,
    setAlert,
    handleDataRequestSubmit,
    handleDataRequestSkip,
    setDataRequest,
  } = useProtocolState({
    sendMessage: stableSendMessage,
    getMessages,
    getActiveVariables,
    mergeResolvedVariables,
    selectedConvenio: state.selectedConvenio,
    onInvalidDataSuggestion,
  });

  const realChat = useChatStream({
    convenioId: state.selectedConvenio?.id || null,
    sessionId: shouldUseMocks ? undefined : sessionId || undefined,
    onSpecialState: handleSpecialState,
    onError: (err) => {
      console.error("[useChatPage] Chat error:", err);
    },
    onResolvedVariables: mergeResolvedVariables,
  });

  // ============================================================================
  // Hook de Chat Mock (useChat del AI SDK) - para Storybook/desarrollo
  // ============================================================================
  const mockChat = useChat({
    transport: new DefaultChatTransport({
      api: SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/chat` : "/api/chat",
    }),
  });

  // Convertir mensajes de AI SDK a nuestro tipo (para modo mock)
  const mockMessages: ChatMessage[] = useMemo(
    () =>
      mockChat.messages.map((msg) => {
        const content = getMessageText(msg);
        return {
          ...msg,
          content,
          role: msg.role as "user" | "assistant" | "system",
        };
      }),
    [mockChat.messages],
  );

  // ============================================================================
  // Convertir mensajes de realChat a ChatMessage[]
  // ============================================================================

  const realMessages: ChatMessage[] = useMemo(
    () =>
      realChat.messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt,
        citations: msg.citations?.map((c) => ({
          source: c.source,
          url: buildPdfHref(c.url_pdf, c.pagina) || c.url || "",
          text: c.section,
          url_pdf: c.url_pdf,
          pagina: c.pagina,
        })),
        // Agregar parts para compatibilidad con UIMessage
        parts: [{ type: "text" as const, text: msg.content }],
      })),
    [realChat.messages],
  );

  // ============================================================================
  // Seleccionar fuente de datos según modo (real o mock)
  // ============================================================================
  const messages: ChatMessage[] = shouldUseMocks ? mockMessages : realMessages;
  messagesRef.current = messages;
  const isLoading = shouldUseMocks
    ? mockChat.status === "streaming" || mockChat.status === "submitted"
    : realChat.isLoading;
  const error = shouldUseMocks ? mockChat.error : realChat.error;

  sendMessageRef.current = async (text, opts) => {
    if (shouldUseMocks) {
      await mockChat.sendMessage({ text });
    } else {
      await realChat.sendMessage(
        text,
        undefined,
        opts?.variables,
        opts?.replayLastUser,
      );
    }
  };
  const citations: Citation[] = shouldUseMocks
    ? mockCitations
    : realChat.citations.map((c) => ({
      source: c.source,
      url: buildPdfHref(c.url_pdf, c.pagina) || c.url || "",
      text: c.section,
      url_pdf: c.url_pdf,
      pagina: c.pagina,
    }));

  // Parsear citaciones cuando termina el streaming (solo modo mock)
  useEffect(() => {
    if (!shouldUseMocks) return;

    if (mockChat.status === "ready" && mockMessages.length > 0) {
      const lastMessage = mockMessages[mockMessages.length - 1];
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
          setMockCitations(parsedCitations);
        }
      }
    }
  }, [useMocks, mockChat.status, mockMessages, shouldUseMocks]);

  // Cargar convenio inicial
  useEffect(() => {
    if (!initialConvenioId || !mockConvenios) return;
    const convenio = mockConvenios.find((c) => c.id === initialConvenioId);
    if (!convenio) return;
    let cancelled = false;
    import("@mocks/data/convenios").then(({ MOCK_PERFIL_HOSTELERIA }) => {
      if (cancelled) return;
      setState((prev) => ({
        ...prev,
        selectedConvenio: convenio,
        perfilJson: MOCK_PERFIL_HOSTELERIA,
      }));
    });
    return () => {
      cancelled = true;
    };
  }, [initialConvenioId, mockConvenios]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Extraer funciones de los hooks de chat para evitar warnings de dependencias
  const mockSetMessages = mockChat.setMessages;
  const mockSendMessage = mockChat.sendMessage;
  const realClearMessages = realChat.clearMessages;

  // Seleccionar convenio
  const selectConvenio = useCallback((convenio: Convenio) => {
    setState((prev) => {
      // Si cambia el convenio, descartar la conversación previa: mantenerla
      // mezclaría contexto de un convenio distinto en el siguiente turno.
      const isChangingConvenio = prev.selectedConvenio?.id !== convenio.id;
      if (isChangingConvenio) {
        if (useMocks) {
          mockSetMessages([]);
          setMockCitations([]);
        } else {
          realClearMessages();
        }
        setLocalInput("");
        setSessionId(null);
        clearProtocol();
        setSalaryMode(false);
      }
      return {
        ...prev,
        selectedConvenio: convenio,
        currentConversationId: isChangingConvenio
          ? null
          : prev.currentConversationId,
      };
    });
    setSelectedConvenioId(convenio.id);
    clearActiveVariables();

    // En modo mock, usar perfil mock (dynamic import para que no entre al bundle prod)
    if (useMocks) {
      import("@mocks/data/convenios").then(({ MOCK_PERFIL_HOSTELERIA }) => {
        setState((prev) => ({ ...prev, perfilJson: MOCK_PERFIL_HOSTELERIA }));
      });
    }
    // En modo real, el perfil se actualizará automáticamente vía useEffect
  }, [
    useMocks,
    mockSetMessages,
    realClearMessages,
    clearActiveVariables,
    clearProtocol,
  ]);
  const realSendMessage = realChat.sendMessage;
  const realSetMessages = realChat.setMessages;

  // Limpiar convenio
  const clearConvenio = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedConvenio: null,
      perfilJson: null,
    }));
    setSelectedConvenioId(null);
    if (useMocks) {
      mockSetMessages([]);
      setMockCitations([]);
    } else {
      realClearMessages();
    }
    setLocalInput("");
    clearActiveVariables();
  }, [useMocks, mockSetMessages, realClearMessages, clearActiveVariables]);

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

      let text = messageText.trim();

      // Si no hay texto pero estamos en modo calculo con variables
      // identificadoras, construir una pregunta sintetica.
      if (!text && salaryMode && hasIdentifyingVariables) {
        text = buildSyntheticPrompt(activeVariables, humanizeVariableLabel);
      }

      if (!text) {
        return;
      }

      let currentSessionId = sessionId;

      // Si es el primer mensaje y no hay sesión, crearla con el texto del usuario como título
      if (
        !shouldUseMocks && !currentSessionId && user?.id &&
        state.selectedConvenio.id
      ) {
        const newSessionId = await createChatSession(
          {
            userId: user.id,
            convenioId: state.selectedConvenio.id,
            firstMessage: text,
          },
          { repo: chatSessionRepo },
        );
        if (newSessionId) {
          // Establecer el sessionId inmediatamente
          currentSessionId = newSessionId;
          setSessionId(newSessionId);
          console.log("[useChatPage] Created new session:", newSessionId);
        } else {
          console.error("[useChatPage] Failed to create chat session");
          return; // No continuar si no se pudo crear la sesión
        }
      }

      // Reset citaciones, alertas y data request al enviar nuevo mensaje
      if (useMocks) {
        setMockCitations([]);
      }
      clearProtocol();

      if (useMocks) {
        await mockSendMessage({ text });
      } else {
        // Pasar el sessionId directamente para asegurar que se use en este mensaje
        console.log(
          "[useChatPage] Sending message with sessionId:",
          currentSessionId,
        );
        await realSendMessage(
          text,
          currentSessionId || undefined,
          activeVariables,
          false,
          salaryMode ? "salary" : undefined,
        );
      }
      setLocalInput("");
    },
    [
      state.selectedConvenio,
      useMocks,
      mockSendMessage,
      realSendMessage,
      sessionId,
      user?.id,
      shouldUseMocks,
      activeVariables,
      salaryMode,
      hasIdentifyingVariables,
      chatSessionRepo,
      clearProtocol,
    ],
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
    if (useMocks) {
      mockSetMessages([]);
      setMockCitations([]);
    } else {
      realClearMessages();
    }
    setLocalInput("");
    setSelectedConvenioId(null);
    setSessionId(null); // Resetear session_id para crear una nueva sesión
    clearProtocol();
    clearActiveVariables();
    setSalaryMode(false);
    setState((prev) => ({
      ...prev,
      currentConversationId: null,
      selectedConvenio: null,
      perfilJson: null,
    }));
  }, [
    useMocks,
    mockSetMessages,
    realClearMessages,
    clearActiveVariables,
    clearProtocol,
  ]);

  // Seleccionar conversación del historial
  const handleSelectConversation = useCallback(
    async (id: string) => {
      setState((prev) => ({ ...prev, currentConversationId: id }));
      clearActiveVariables();
      setSalaryMode(false);

      // En modo mock, usar mensajes mock (dynamic import para que no entre al bundle prod)
      if (shouldUseMocks) {
        const { MOCK_CHAT_MESSAGES } = await import("@mocks/data/convenios");
        const historicMessages: ChatMessage[] = MOCK_CHAT_MESSAGES.map(
          (msg) => ({
            ...msg,
            role: msg.role as "user" | "assistant" | "system",
            parts: [{ type: "text" as const, text: msg.content }],
          }),
        );
        mockSetMessages(historicMessages);
        return;
      }

      // En modo real, cargar la conversación desde el backend
      try {
        const convenioIdForSession = await getConvenioIdForSession(id, {
          repo: chatSessionRepo,
        });
        if (!convenioIdForSession) {
          console.error("[useChatPage] Session not found:", id);
          return;
        }

        const messages = await loadChatSessionMessages(id, {
          repo: chatSessionRepo,
        });
        if (!messages) {
          console.error("[useChatPage] Failed to load chat messages");
          return;
        }

        realSetMessages(
          messages.map((msg) => ({
            id: msg.id,
            role: msg.role as "user" | "assistant",
            content: msg.content,
            createdAt: msg.createdAt,
            citations: msg.citations || [],
          })),
        );

        setSessionId(id);

        const convenio = await getConvenioById(convenioIdForSession, {
          repo: convenioRepo,
        });
        if (convenio) {
          setState((prev) => ({ ...prev, selectedConvenio: convenio }));
          setSelectedConvenioId(convenio.id);
        }
      } catch (err) {
        console.error("[useChatPage] Error loading conversation:", err);
      }
    },
    [
      shouldUseMocks,
      mockSetMessages,
      realSetMessages,
      chatSessionRepo,
      convenioRepo,
      clearActiveVariables,
    ],
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

    // Estado de data request
    dataRequestState,

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

    // Handlers de data request
    handleDataRequestSubmit,
    handleDataRequestSkip,

    // Variables estructuradas (chips)
    activeVariables,
    handleVariableRemove,
    humanizeVariableLabel,

    // Util para testing/mocks
    setAlert,
    setDataRequest,

    // Modo calculo salarial
    salaryMode,
    setSalaryMode,
    hasIdentifyingVariables,
  };
}
