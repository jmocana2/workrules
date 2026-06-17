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
      title: "Consulta sobre el convenio: {convenio}",
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

export const AUTH_TEXTS = {
  // Form labels y placeholders
  form: {
    title: "Empezar una nueva consulta laboral",
    emailLabel: "Usuario",
    emailPlaceholder: "usuario@empresa.com",
    // eslint-disable-next-line sonarjs/no-hardcoded-passwords -- label de UI, no una contraseña real
    passwordLabel: "Contraseña",
    passwordPlaceholder: "••••••••",
    showPassword: "Mostrar contraseña",
    hidePassword: "Ocultar contraseña",
    submit: "Iniciar Sesión",
    submitting: "Iniciando sesión...",
  },

  // Mensajes de error de autenticación
  errors: {
    network:
      "No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.",
    invalidCredentials: "Email o contraseña incorrectos.",
    emailNotConfirmed: "Debes confirmar tu email antes de iniciar sesión.",
    userNotFound: "No existe ninguna cuenta con ese email.",
    rateLimit: "Has hecho demasiados intentos. Espera unos minutos.",
    weakPassword: "La contraseña es demasiado débil.",
    userBanned: "Esta cuenta ha sido suspendida.",
    generic: "No se pudo iniciar sesión. Inténtalo de nuevo.",
  },
} as const;
