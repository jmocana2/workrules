import type {
  AlertConflictPayload,
  AlertInvalidDataPayload,
  AlertSMIPayload,
  AlertState,
  Convenio,
  DataRequestState,
} from "../ChatPage.types";
import { parseDataRequestEvent } from "../parseAlertEvent";

/**
 * Evento crudo del protocolo tal y como llega desde `useChatStream` /
 * `chat-api`. Se mantiene en `string` + `Record<string, unknown>` para que
 * el mapper sea agnóstico del transporte.
 */
export interface SpecialStateEvent {
  type: string;
  payload: Record<string, unknown>;
}

/**
 * Contexto de dominio que el mapper necesita para producir el estado UI:
 * el convenio actualmente seleccionado (para el label del DataRequestCard)
 * y dos funciones puras que evitan acoplar el mapper a helpers concretos.
 */
export interface SpecialStateMapperContext {
  selectedConvenio: Convenio | null;
  humanize: (name: string) => string;
  isIdentifying: (name: string) => boolean;
}

/**
 * Resultado del mapper. `alert` y `dataRequest` son mutuamente excluyentes
 * en la práctica (cada `type` alimenta uno u otro), pero se modela como
 * objeto parcial para simplificar el consumo en el hook.
 */
export interface SpecialStateUiResult {
  alert?: AlertState;
  dataRequest?: DataRequestState;
}

/**
 * Traduce un evento del protocolo del backend en el estado UI equivalente
 * (`alertState` o `dataRequestState`).
 *
 * Casos que devuelven `null` (el consumidor no debe actualizar estado):
 * - `incomplete` cuyas variables faltantes son TODAS moduladoras.
 * - `invalid` sin `invalidVariables`.
 * - `conflicting` con menos de 2 variables en el primer conflicto.
 * - Cualquier `type` no reconocido.
 */
export function mapSpecialStateToUi(
  event: SpecialStateEvent,
  ctx: SpecialStateMapperContext,
): SpecialStateUiResult | null {
  switch (event.type) {
    case "incomplete":
      return mapIncomplete(event.payload, ctx);
    case "invalid":
      return mapInvalid(event.payload);
    case "smi_alert":
      return mapSmiAlert(event.payload);
    case "conflicting":
      return mapConflicting(event.payload);
    default:
      return null;
  }
}

function mapIncomplete(
  payload: Record<string, unknown>,
  ctx: SpecialStateMapperContext,
): SpecialStateUiResult | null {
  const typed = payload as {
    missingVariables?: string[];
    suggestions?: Record<string, string[]>;
  };

  const identifying = (typed.missingVariables ?? []).filter(ctx.isIdentifying);
  if (identifying.length === 0) return null;

  const convenio = ctx.selectedConvenio;
  const convenioLabel = convenio?.nombre_corto ||
    convenio?.nombre_oficial ||
    convenio?.nombre;

  const dataRequestPayload = parseDataRequestEvent(
    JSON.stringify({
      title: "Necesito más información",
      convenioName: convenioLabel,
      fields: identifying.map((v) => ({
        name: v,
        label: ctx.humanize(v),
        type: "radio" as const,
        options: typed.suggestions?.[v]?.map((s) => ({
          value: s,
          label: s,
        })) || [],
      })),
      maxAttempts: 3,
      currentAttempt: 1,
    }),
  );

  return dataRequestPayload ? { dataRequest: dataRequestPayload } : null;
}

function mapInvalid(
  payload: Record<string, unknown>,
): SpecialStateUiResult | null {
  const raw = payload as {
    message?: string;
    invalidVariables?: Array<{
      name: string;
      reason: string;
      value: string | number;
    }>;
  };
  const first = raw.invalidVariables?.[0];
  if (!first) return null;

  const alertPayload: AlertInvalidDataPayload = {
    field: first.name,
    value: first.value,
    limit: first.reason,
    legalReference: raw.message,
  };

  return {
    alert: {
      type: "invalid_data",
      payload: alertPayload,
      isVisible: true,
    },
  };
}

function mapSmiAlert(
  payload: Record<string, unknown>,
): SpecialStateUiResult {
  const alertPayload = payload as unknown as AlertSMIPayload;
  return {
    alert: {
      type: "smi",
      payload: alertPayload,
      isVisible: true,
    },
  };
}

function mapConflicting(
  payload: Record<string, unknown>,
): SpecialStateUiResult | null {
  const raw = payload as {
    message?: string;
    conflictingVariables?: Array<{
      variables: string[];
      reason: string;
    }>;
  };
  const first = raw.conflictingVariables?.[0];
  if (!first || first.variables.length < 2) return null;

  const [name1, name2] = first.variables;
  const alertPayload: AlertConflictPayload = {
    field1: { name: name1, value: "" },
    field2: { name: name2, value: "" },
    explanation: first.reason || raw.message || "",
    options: [],
  };

  return {
    alert: {
      type: "conflict",
      payload: alertPayload,
      isVisible: true,
    },
  };
}
