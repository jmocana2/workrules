/**
 * parseAlertEvent - Utilidad para parsear eventos SSE de alertas y data requests
 *
 * Parsea eventos del backend que contienen información de alertas
 * del protocolo de interacción (Estados D, E, F) y solicitudes de datos (Estado B).
 */

import type {
  AlertState,
  AlertType,
  DataRequestField,
  DataRequestPayload,
  DataRequestState,
  SSEAlertEvent,
} from "./ChatPage.types";

const VALID_ALERT_TYPES: AlertType[] = ["smi", "invalid_data", "conflict"];

/**
 * Parsea un evento SSE de alerta y retorna el estado correspondiente.
 * Retorna null si el evento no es válido.
 *
 * @param data - String JSON del evento SSE
 * @returns AlertState si es válido, null en caso contrario
 */
export function parseAlertEvent(data: string): AlertState | null {
  try {
    const parsed: unknown = JSON.parse(data);

    if (!isSSEAlertEvent(parsed)) {
      return null;
    }

    return {
      type: parsed.type,
      payload: parsed.payload,
      isVisible: true,
    };
  } catch {
    return null;
  }
}

/**
 * Type guard para validar que el objeto es un SSEAlertEvent
 */
function isSSEAlertEvent(obj: unknown): obj is SSEAlertEvent {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  const event = obj as Record<string, unknown>;

  return (
    typeof event.type === "string" &&
    VALID_ALERT_TYPES.includes(event.type as AlertType) &&
    typeof event.payload === "object" &&
    event.payload !== null &&
    !Array.isArray(event.payload)
  );
}

/**
 * Estado de alerta vacío/inicial
 */
const EMPTY_ALERT_STATE: AlertState = {
  type: null,
  payload: null,
  isVisible: false,
};

/**
 * Crea un estado de alerta inicial (sin alerta visible)
 */
export function createInitialAlertState(): AlertState {
  return { ...EMPTY_ALERT_STATE };
}

/**
 * Limpia el estado de alerta (oculta la alerta)
 */
export function clearAlertState(): AlertState {
  return { ...EMPTY_ALERT_STATE };
}

// ============================================================================
// DataRequest Event Parsing (Estado B)
// ============================================================================

/**
 * Estado de data request vacío/inicial
 */
const EMPTY_DATA_REQUEST_STATE: DataRequestState = {
  isVisible: false,
  payload: null,
};

/**
 * Crea el estado inicial de data request (sin formulario visible)
 */
export function createInitialDataRequestState(): DataRequestState {
  return { ...EMPTY_DATA_REQUEST_STATE };
}

/**
 * Crea un estado de data request limpio (ocultar formulario)
 */
export function clearDataRequestState(): DataRequestState {
  return { ...EMPTY_DATA_REQUEST_STATE };
}

/**
 * Parsea un evento SSE de data_request y retorna el estado correspondiente.
 * Retorna null si el evento no es valido.
 *
 * @param data - String JSON del evento SSE
 * @returns DataRequestState si es válido, null en caso contrario
 */
export function parseDataRequestEvent(data: string): DataRequestState | null {
  try {
    const parsed: unknown = JSON.parse(data);

    if (!isDataRequestPayload(parsed)) {
      return null;
    }

    return {
      isVisible: true,
      payload: parsed,
    };
  } catch {
    return null;
  }
}

/**
 * Type guard para validar que el objeto es un DataRequestPayload valido
 */
function isDataRequestPayload(obj: unknown): obj is DataRequestPayload {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  const payload = obj as Record<string, unknown>;

  // Validar campos requeridos
  if (typeof payload.title !== "string") {
    return false;
  }

  if (!Array.isArray(payload.fields)) {
    return false;
  }

  if (typeof payload.maxAttempts !== "number") {
    return false;
  }

  if (typeof payload.currentAttempt !== "number") {
    return false;
  }

  // Validar que cada campo tenga la estructura correcta
  for (const field of payload.fields) {
    if (!isValidDataRequestField(field)) {
      return false;
    }
  }

  return true;
}

/**
 * Valida que una opcion tenga la estructura correcta
 */
function isValidDataRequestOption(
  option: unknown,
): option is { value: string; label: string } {
  if (typeof option !== "object" || option === null) {
    return false;
  }
  const o = option as Record<string, unknown>;
  return typeof o.value === "string" && typeof o.label === "string";
}

/**
 * Valida que un campo tenga la estructura basica correcta
 */
function hasValidFieldStructure(f: Record<string, unknown>): boolean {
  return (
    typeof f.name === "string" &&
    typeof f.label === "string" &&
    (f.type === "radio" || f.type === "stars")
  );
}

/**
 * Valida que un campo tenga la estructura correcta
 */
function isValidDataRequestField(field: unknown): field is DataRequestField {
  if (typeof field !== "object" || field === null) {
    return false;
  }

  const f = field as Record<string, unknown>;

  if (!hasValidFieldStructure(f)) {
    return false;
  }

  // Si es tipo radio, debe tener options validas
  if (f.type === "radio") {
    if (!Array.isArray(f.options)) {
      return false;
    }
    return f.options.every(isValidDataRequestOption);
  }

  return true;
}
