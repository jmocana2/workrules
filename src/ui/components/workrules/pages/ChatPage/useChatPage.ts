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

import { createChatSession } from "@/lib/supabase";
import { useChat } from "@ai-sdk/react";
import {
  MOCK_CHAT_MESSAGES,
  MOCK_CONVENIOS,
  MOCK_CONVERSATIONS,
  MOCK_PERFIL_HOSTELERIA,
} from "@mocks/data/convenios";
import { useChatSessions } from "@ui/hooks/useChatSessions";
import { useChatStream } from "@ui/hooks/useChatStream";
import { useConvenioVariables } from "@ui/hooks/useConvenioVariables";
import { useSupabase } from "@ui/hooks/useSupabase";
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
  DataRequestState,
  PerfilJson,
  UseChatPageReturn,
} from "./ChatPage.types";
import {
  clearAlertState,
  clearDataRequestState,
  createInitialAlertState,
  createInitialDataRequestState,
  parseDataRequestEvent,
} from "./parseAlertEvent";

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
    mockConvenios = MOCK_CONVENIOS,
    mockPerfil,
    mockConversations = MOCK_CONVERSATIONS,
    useMocks = USE_MOCK_API,
  } = options;

  // ============================================================================
  // Hooks de data fetching (TFM.3)
  // ============================================================================
  const { user } = useSupabase();
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
  const shouldUseMocks = useMocks;
  const [state, setState] = useState<ChatPageState>({
    selectedConvenio: null,
    perfilJson: shouldUseMocks ? (mockPerfil || null) : null,
    isVariablesPanelCollapsed: false,
    isSidebarCollapsed: false,
    conversations: shouldUseMocks ? mockConversations : [],
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

  // Estado de alertas del protocolo (Estados D, E, F)
  const [alertState, setAlertState] = useState<AlertState>(
    createInitialAlertState(),
  );

  // Estado de data request del protocolo (Estado B)
  const [dataRequestState, setDataRequestState] = useState<DataRequestState>(
    createInitialDataRequestState(),
  );

  // Input controlado localmente
  const [localInput, setLocalInput] = useState("");

  // ============================================================================
  // Hook de Chat Real (useChatStream) - cuando NO usamos mocks
  // ============================================================================
  const handleSpecialState = useCallback(
    (specialState: { type: string; payload: Record<string, unknown> }) => {
      // Mapear estados especiales del backend a alertas/data request
      switch (specialState.type) {
        case "incomplete": {
          // Estado B - Datos incompletos -> mostrar DataRequestCard
          const payload = specialState.payload as {
            missingVariables?: string[];
            suggestions?: Record<string, string[]>;
          };

          // Construir DataRequestPayload desde el payload del backend
          const dataRequestPayload = parseDataRequestEvent(
            JSON.stringify({
              title: "Necesito más información",
              convenioName: state.selectedConvenio?.nombre,
              fields: payload.missingVariables?.map((v) => ({
                name: v,
                label: v,
                type: "radio" as const,
                options: payload.suggestions?.[v]?.map((s) => ({
                  value: s,
                  label: s,
                })) || [],
              })) || [],
              maxAttempts: 3,
              currentAttempt: 1,
            }),
          );

          if (dataRequestPayload) {
            setDataRequestState(dataRequestPayload);
          }
          break;
        }

        case "invalid":
          // Estado D - Datos invalidos
          setAlertState({
            type: "invalid_data",
            payload: specialState.payload as unknown as AlertState["payload"],
            isVisible: true,
          });
          break;

        case "smi_alert":
          // Estado E - Salario menor al SMI
          setAlertState({
            type: "smi",
            payload: specialState.payload as unknown as AlertState["payload"],
            isVisible: true,
          });
          break;

        case "conflicting":
          // Estado F - Datos contradictorios
          setAlertState({
            type: "conflict",
            payload: specialState.payload as unknown as AlertState["payload"],
            isVisible: true,
          });
          break;
      }
    },
    [state.selectedConvenio?.nombre],
  );

  const realChat = useChatStream({
    convenioId: state.selectedConvenio?.id || null,
    sessionId: shouldUseMocks ? undefined : sessionId || undefined,
    onSpecialState: handleSpecialState,
    onError: (err) => {
      console.error("[useChatPage] Chat error:", err);
    },
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
    [mockChat.messages, getMessageText],
  );

  // ============================================================================
  // Convertir mensajes de realChat a ChatMessage[]
  // ============================================================================

  function buildPdfHref(
    urlPdf: string | null | undefined,
    pagina: number | null | undefined,
  ): string {
    if (!urlPdf) return "";
    return pagina != null ? `${urlPdf}#page=${pagina}` : urlPdf;
  }
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
  const isLoading = shouldUseMocks
    ? mockChat.status === "streaming" || mockChat.status === "submitted"
    : realChat.isLoading;
  const error = shouldUseMocks ? mockChat.error : realChat.error;
  const citations: Citation[] = shouldUseMocks
    ? mockCitations
    : realChat.citations.map((c) => ({
      source: c.source,
      url: buildPdfHref(c.url_pdf, c.pagina) || c.url || "",
      text: c.section,
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
    setSelectedConvenioId(convenio.id);

    // En modo mock, usar perfil mock
    if (useMocks) {
      setState((prev) => ({ ...prev, perfilJson: MOCK_PERFIL_HOSTELERIA }));
    }
    // En modo real, el perfil se actualizará automáticamente vía useEffect
  }, [useMocks]);

  // Extraer funciones de los hooks de chat para evitar warnings de dependencias
  const mockSetMessages = mockChat.setMessages;
  const mockSendMessage = mockChat.sendMessage;
  const realClearMessages = realChat.clearMessages;
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
  }, [useMocks, mockSetMessages, realClearMessages]);

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

      let currentSessionId = sessionId;

      // Si es el primer mensaje y no hay sesión, crearla con el texto del usuario como título
      if (
        !shouldUseMocks && !currentSessionId && user?.id &&
        state.selectedConvenio.id
      ) {
        const newSessionId = await createChatSession(
          user.id,
          state.selectedConvenio.id,
          text,
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
      setAlertState(clearAlertState());
      setDataRequestState(clearDataRequestState());

      if (useMocks) {
        await mockSendMessage({ text });
      } else {
        // Pasar el sessionId directamente para asegurar que se use en este mensaje
        console.log(
          "[useChatPage] Sending message with sessionId:",
          currentSessionId,
        );
        await realSendMessage(text, currentSessionId || undefined);
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
    setAlertState(clearAlertState());
    setDataRequestState(clearDataRequestState());
    setState((prev) => ({
      ...prev,
      currentConversationId: null,
      selectedConvenio: null,
      perfilJson: null,
    }));
  }, [useMocks, mockSetMessages, realClearMessages]);

  // Seleccionar conversación del historial
  const handleSelectConversation = useCallback(
    async (id: string) => {
      setState((prev) => ({ ...prev, currentConversationId: id }));

      // En modo mock, usar mensajes mock
      if (shouldUseMocks) {
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
        const { loadChatMessages, supabase } = await import("@/lib/supabase");

        // Cargar la sesión de chat para obtener el convenio_id
        const { data: sessionData, error: sessionError } = await supabase
          .from("chat_sessions")
          .select("convenio_id")
          .eq("id", id)
          .single();

        if (sessionError || !sessionData) {
          console.error("[useChatPage] Session not found:", sessionError);
          return;
        }

        // Cargar mensajes de la conversación
        const messages = await loadChatMessages(id);

        if (!messages) {
          console.error("[useChatPage] Failed to load chat messages");
          return;
        }

        // Convertir mensajes de la BD al formato de ChatStreamMessage
        const loadedMessages = messages.map((msg) => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          content: msg.content,
          createdAt: new Date(msg.created_at),
          citations: msg.metadata?.citations || [],
        }));

        // Establecer los mensajes usando realChat
        realSetMessages(loadedMessages);

        // Establecer el sessionId para continuar la conversación
        setSessionId(id);

        // Cargar el convenio correspondiente desde Supabase
        const { data: convenioData, error: convenioError } = await supabase
          .from("convenios")
          .select(
            "id, nombre, nombre_oficial, nombre_corto, ambito, ambito_territorial, codigo_regcon, fecha_vigencia, url_pdf, estado, visibilidad, owner_id, created_at, updated_at",
          )
          .eq("id", sessionData.convenio_id)
          .single();

        if (convenioError) {
          console.error("[useChatPage] Error loading convenio:", convenioError);
          return;
        }

        if (convenioData) {
          const convenio = {
            id: convenioData.id,
            nombre: convenioData.nombre,
            nombre_oficial: convenioData.nombre_oficial ?? null,
            nombre_corto: convenioData.nombre_corto ?? null,
            ambito: convenioData.ambito ?? "",
            ambito_territorial: convenioData.ambito_territorial ?? null,
            codigo_regcon: convenioData.codigo_regcon ?? "",
            fecha_vigencia: convenioData.fecha_vigencia?.toString() ?? "",
            url_pdf: convenioData.url_pdf ?? "",
            estado: convenioData.estado,
            visibilidad: convenioData.visibilidad,
            owner_id: convenioData.owner_id,
            created_at: convenioData.created_at,
            updated_at: convenioData.updated_at,
          };
          setState((prev) => ({ ...prev, selectedConvenio: convenio }));
          setSelectedConvenioId(convenio.id);
        }
      } catch (err) {
        console.error("[useChatPage] Error loading conversation:", err);
      }
    },
    [shouldUseMocks, mockSetMessages, realSetMessages],
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
      const text = `Mi respuesta es: ${option.label}`;
      if (useMocks) {
        await mockSendMessage({ text });
      } else {
        await realSendMessage(text);
      }
      setAlertState(clearAlertState());
    },
    [useMocks, mockSendMessage, realSendMessage],
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

  // ============================================================================
  // Handlers de DataRequest del protocolo (Estado B)
  // ============================================================================

  /**
   * Manejar envio de respuesta de DataRequestCard
   * Construye un mensaje con los valores seleccionados
   */
  const handleDataRequestSubmit = useCallback(
    async (values: Record<string, string>) => {
      if (!dataRequestState.payload) {
        return;
      }

      // Construir mensaje con los valores seleccionados
      const entries = Object.entries(values);
      const formattedValues = entries
        .map(([key, value]) => {
          // Buscar el campo por nombre
          const field = dataRequestState.payload?.fields.find(
            (f) => f.name === key,
          );
          const fieldLabel = field?.label || key;

          // Si es un campo de opciones, buscar el label de la opcion
          if (field?.type === "radio" && field.options) {
            const option = field.options.find((o) => o.value === value);
            return `${fieldLabel}: ${option?.label || value}`;
          }

          // Si es estrellas, formatear como "X estrellas"
          if (field?.type === "stars") {
            return `${fieldLabel}: ${value} estrellas`;
          }

          return `${fieldLabel}: ${value}`;
        })
        .join(", ");

      const text = `Mis datos son: ${formattedValues}`;

      // Limpiar estado y enviar
      setDataRequestState(clearDataRequestState());
      if (useMocks) {
        await mockSendMessage({ text });
      } else {
        await realSendMessage(text);
      }
    },
    [dataRequestState.payload, useMocks, mockSendMessage, realSendMessage],
  );

  /**
   * Manejar "No lo se" - mostrar opciones de establecimiento/clase
   *
   * Cuando el usuario no conoce los datos solicitados (ej: tipo de establecimiento),
   * pedimos al backend que muestre las OPCIONES disponibles segun el convenio,
   * para que el usuario pueda elegir.
   */
  const handleDataRequestSkip = useCallback(async () => {
    // Extraer contexto del ultimo mensaje del usuario
    const lastUserMessage = messages
      .filter((m) => m.role === "user")
      .pop();
    const contexto = lastUserMessage?.content?.toLowerCase() || "";

    // Extraer categoria profesional usando busqueda de texto simple
    // para evitar regex complejas que disparan sonarjs/regex-complexity
    const categoriasConocidas = [
      "ayudante de cocina",
      "jefe de cocina",
      "cocinero",
      "camarero",
      "ayudante de camarero",
      "recepcionista",
      "gobernanta",
      "pinche",
      "barman",
      "jefe de sala",
      "camarera de pisos",
    ];

    let categoriaDetectada = "";
    for (const cat of categoriasConocidas) {
      if (contexto.includes(cat)) {
        categoriaDetectada = cat;
        break;
      }
    }

    setDataRequestState(clearDataRequestState());

    // Construir mensaje pidiendo las OPCIONES disponibles, no los salarios
    let text: string;
    if (categoriaDetectada) {
      text =
        `Para ${categoriaDetectada}, muestrame los tipos de establecimiento y clases disponibles en el convenio con sus salarios correspondientes`;
    } else {
      text =
        "Muestrame los tipos de establecimiento, clases y categorias profesionales disponibles en el convenio";
    }

    if (useMocks) {
      await mockSendMessage({ text });
    } else {
      await realSendMessage(text);
    }
  }, [messages, useMocks, mockSendMessage, realSendMessage]);

  /**
   * Funcion para establecer data request manualmente (util para mocks/testing)
   */
  const setDataRequest = useCallback((newState: DataRequestState) => {
    setDataRequestState(newState);
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

    // Util para testing/mocks
    setAlert,
    setDataRequest,
  };
}
