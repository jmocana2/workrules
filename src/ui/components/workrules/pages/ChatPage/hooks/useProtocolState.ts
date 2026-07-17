import { useCallback, useState } from "react";
import type {
  AlertState,
  ChatMessage,
  ConflictOption,
  Convenio,
  DataRequestState,
} from "../ChatPage.types";
import {
  clearAlertState,
  clearDataRequestState,
  createInitialAlertState,
  createInitialDataRequestState,
} from "../parseAlertEvent";
import { mapSpecialStateToUi } from "../helpers/specialStateMapper";
import {
  humanizeVariableLabel,
  isIdentifyingVariable,
} from "../helpers/variableClassification";
import { buildFallbackOptionsPrompt } from "../helpers/syntheticPrompt";

/**
 * Firma del sender que el sub-hook usa para reenviar mensajes al backend.
 * El segundo argumento (`replayLastUser`) indica al `useChatStream` que no
 * pinte de nuevo el mensaje de usuario — se usa al responder a un
 * DataRequestCard tras haber recopilado variables.
 */
export type ProtocolSendMessage = (
  text: string,
  opts?: {
    variables?: Record<string, string | number>;
    replayLastUser?: boolean;
  },
) => Promise<void>;

/**
 * Dependencias que el hook recibe del orquestador. Se pasan como argumentos
 * para mantener el sub-hook agnóstico del transporte (real/mock) y del
 * estado de chips (evita ciclos).
 */
export interface UseProtocolStateOptions {
  sendMessage: ProtocolSendMessage;
  getMessages: () => ChatMessage[];
  getActiveVariables: () => Record<string, string>;
  mergeResolvedVariables: (resolved: Record<string, string>) => void;
  selectedConvenio: Convenio | null;
  onInvalidDataSuggestion: (suggestion: string) => void;
}

export interface UseProtocolStateReturn {
  alertState: AlertState;
  dataRequestState: DataRequestState;
  handleSpecialState: (
    specialState: { type: string; payload: Record<string, unknown> },
  ) => void;
  clearProtocol: () => void;
  handleAlertDismiss: () => void;
  handleInvalidDataSuggestion: (suggestion: string) => void;
  handleConflictOption: (option: ConflictOption) => Promise<void>;
  handleSMIViewDetails: () => void;
  setAlert: (newAlertState: AlertState) => void;
  handleDataRequestSubmit: (values: Record<string, string>) => Promise<void>;
  handleDataRequestSkip: () => Promise<void>;
  setDataRequest: (newState: DataRequestState) => void;
}

/**
 * Gestiona el estado del protocolo del backend: alertas (Estados D/E/F) y
 * data requests (Estado B) — más los handlers UI que los descartan,
 * insertan sugerencias, responden opciones de conflicto y reenvían la
 * pregunta original tras recopilar variables faltantes.
 *
 */
export function useProtocolState(
  options: UseProtocolStateOptions,
): UseProtocolStateReturn {
  const {
    sendMessage,
    getMessages,
    getActiveVariables,
    mergeResolvedVariables,
    selectedConvenio,
    onInvalidDataSuggestion,
  } = options;

  const [alertState, setAlertState] = useState<AlertState>(
    createInitialAlertState(),
  );
  const [dataRequestState, setDataRequestState] = useState<DataRequestState>(
    createInitialDataRequestState(),
  );

  const handleSpecialState = useCallback(
    (specialState: { type: string; payload: Record<string, unknown> }) => {
      const result = mapSpecialStateToUi(specialState, {
        selectedConvenio,
        humanize: humanizeVariableLabel,
        isIdentifying: isIdentifyingVariable,
      });
      if (!result) return;
      if (result.alert) setAlertState(result.alert);
      if (result.dataRequest) setDataRequestState(result.dataRequest);
    },
    [selectedConvenio],
  );

  const clearProtocol = useCallback(() => {
    setAlertState(clearAlertState());
    setDataRequestState(clearDataRequestState());
  }, []);

  const handleAlertDismiss = useCallback(() => {
    setAlertState(clearAlertState());
  }, []);

  const handleInvalidDataSuggestion = useCallback(
    (suggestion: string) => {
      onInvalidDataSuggestion(suggestion);
      setAlertState(clearAlertState());
    },
    [onInvalidDataSuggestion],
  );

  const handleConflictOption = useCallback(
    async (option: ConflictOption) => {
      const text = `Mi respuesta es: ${option.label}`;
      await sendMessage(text);
      setAlertState(clearAlertState());
    },
    [sendMessage],
  );

  const handleSMIViewDetails = useCallback(() => {
    // TODO: Implementar visualización de detalles SMI
    console.log("Ver detalles SMI:", alertState.payload);
  }, [alertState.payload]);

  const setAlert = useCallback((newAlertState: AlertState) => {
    setAlertState(newAlertState);
  }, []);

  const handleDataRequestSubmit = useCallback(
    async (values: Record<string, string>) => {
      const payload = dataRequestState.payload;
      if (!payload) return;

      const newChips: Record<string, string> = {};
      for (const [key, value] of Object.entries(values)) {
        const field = payload.fields.find((f) => f.name === key);
        newChips[key] = field?.type === "stars" ? `${value} estrellas` : value;
      }
      const mergedVariables = { ...getActiveVariables(), ...newChips };
      mergeResolvedVariables(newChips);

      const lastUserMessage = [...getMessages()].reverse().find(
        (m) => m.role === "user",
      );
      const text = lastUserMessage?.content || "";
      setDataRequestState(clearDataRequestState());
      if (!text) return;

      await sendMessage(text, {
        variables: mergedVariables,
        replayLastUser: true,
      });
    },
    [
      dataRequestState.payload,
      getActiveVariables,
      mergeResolvedVariables,
      getMessages,
      sendMessage,
    ],
  );

  const handleDataRequestSkip = useCallback(
    async () => {
      const lastUserMessage = getMessages()
        .filter((m) => m.role === "user")
        .pop();
      setDataRequestState(clearDataRequestState());
      const text = buildFallbackOptionsPrompt(lastUserMessage?.content ?? "");
      await sendMessage(text);
    },
    [getMessages, sendMessage],
  );

  const setDataRequest = useCallback((newState: DataRequestState) => {
    setDataRequestState(newState);
  }, []);

  return {
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
  };
}
