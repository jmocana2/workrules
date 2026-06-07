/**
 * Textos y mensajes de la aplicación
 * Centralizados para facilitar traducción futura y mantener consistencia
 */

export const CHAT_TEXTS = {
  // ConvenioSelector
  convenioSelector: {
    placeholder: "Selecciona un convenio para empezar",
    searchPlaceholder: "Buscar convenio",
    noResults: "No se encontraron convenios.",
  },

  // Chat input
  input: {
    placeholder: "Pregunta sobre el convenio...",
    placeholderNoConvenio: "Selecciona un convenio primero",
    sending: "Enviando...",
    stop: "Detener",
    submit: "Enviar",
  },

  // Empty states
  empty: {
    noConvenio: {
      title: "Selecciona un convenio para empezar",
      description:
        "Elige un convenio colectivo del selector superior para comenzar tu consulta.",
    },
    withConvenio: {
      title: "Consulta sobre {convenio}",
      description:
        "Haz una pregunta sobre el convenio o usa las variables del panel derecho para consultas específicas.",
    },
    noMessages: {
      title: "No hay conversaciones",
      description: "Inicia una nueva consulta",
    },
  },

  // Loading states
  loading: {
    typing: "Escribiendo...",
    thinking: "Pensando...",
    searching: "Buscando en el convenio...",
  },

  // VariablesPanel
  variables: {
    title: "Variables del convenio",
    noConvenio: "Selecciona un convenio para ver sus variables",
    noValues: "Sin valores definidos",
  },

  // Sidebar
  sidebar: {
    newConversation: "Nueva consulta",
    settings: "Abrir configuración",
    planFree: "Free",
    planPremium: "Premium",
  },

  // Sources
  sources: {
    used: "Usó",
    source: "fuente",
    sources: "fuentes",
  },

  // Errors
  errors: {
    generic: "Ha ocurrido un error. Por favor, inténtalo de nuevo.",
    noConvenio: "Debes seleccionar un convenio antes de enviar un mensaje.",
    emptyMessage: "El mensaje no puede estar vacío.",
    networkError: "Error de conexión. Verifica tu conexión a internet.",
  },
} as const;
