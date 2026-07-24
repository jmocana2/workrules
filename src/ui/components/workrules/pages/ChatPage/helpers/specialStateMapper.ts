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
      return mapInvalid(event.payload, ctx);
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
  ctx: SpecialStateMapperContext,
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
    field: ctx.humanize(first.name),
    value: first.value,
    limit: describeReason(first.reason),
  };

  return {
    alert: {
      type: "invalid_data",
      payload: alertPayload,
      isVisible: true,
    },
  };
}

/**
 * Traduce el `reason` code estable emitido por el backend
 * (`<field>_<kind>`) a un texto humano legible para el usuario.
 * Devuelve undefined cuando no hay una explicación corta útil (en ese caso
 * el componente omite la cláusula "pero ...").
 */
function describeReason(reason: string): string | undefined {
  return REASON_DESCRIPTIONS[reason];
}

const REASON_DESCRIPTIONS: Record<string, string> = {
  // horasSemanales
  horasSemanales_above_product_max: "el máximo aceptado es 40 horas por semana",
  horasSemanales_below_minimum: "el mínimo aceptado es 1 hora por semana",
  horasSemanales_not_half_hour_step: "debe ser un múltiplo de 0,5 horas",
  horasSemanales_not_finite: "debe ser un número válido",

  // horasExtra (VO: horasExtraAnuales)
  horasExtraAnuales_above_product_max: "el máximo aceptado son 80 horas al año",
  horasExtraAnuales_below_minimum: "no puede ser negativo",
  horasExtraAnuales_not_integer: "debe ser un número entero de horas",
  horasExtraAnuales_not_finite: "debe ser un número válido",

  // horasNocturnas
  horasNocturnas_below_minimum: "no puede ser negativo",
  horasNocturnas_not_finite: "debe ser un número válido",
  horas_nocturnas_exceden_base_anual:
    "las horas nocturnas superan el tope anual según las horas semanales indicadas",

  // antiguedadAnos
  antiguedadAnos_above_maximum: "el máximo aceptado son 50 años",
  antiguedadAnos_below_minimum: "no puede ser negativo",
  antiguedadAnos_not_half_year_step: "debe ser un múltiplo de 0,5 años",
  antiguedadAnos_not_finite: "debe ser un número válido",

  // jornada
  completa_con_horas_bajas:
    "una jornada completa requiere al menos 35 horas semanales",
  parcial_con_horas_completas:
    "una jornada parcial no puede alcanzar las 40 horas semanales",
  jornada_tipo_desconocido:
    "el tipo de jornada debe ser 'completa' o 'parcial'",
};

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
