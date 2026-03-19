/**
 * parseAlertEvent - Utilidad para parsear eventos SSE de alertas
 *
 * Parsea eventos del backend que contienen información de alertas
 * del protocolo de interacción (Estados D, E, F).
 */

import type { AlertState, AlertType, SSEAlertEvent } from "./ChatPage.types";

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
