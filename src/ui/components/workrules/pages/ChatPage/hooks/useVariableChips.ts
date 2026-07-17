import { useCallback, useMemo, useState } from "react";
import { isIdentifyingVariable } from "../helpers/variableClassification";

/**
 * API pública del hook de chips de variables activas encima del textarea.
 * Los chips persisten entre turnos hasta que el usuario los elimine o
 * cambie de convenio.
 */
export interface UseVariableChipsReturn {
  activeVariables: Record<string, string>;
  hasIdentifyingVariables: boolean;
  handleVariableClick: (variable: string, value: string) => void;
  handleVariableRemove: (variable: string) => void;
  mergeResolvedVariables: (resolved: Record<string, string>) => void;
  clear: () => void;
}

/**
 * Gestiona los chips de variables estructuradas activas del chat.
 *
 * Reglas:
 * - Una sola entrada por nombre: click en un valor distinto sobrescribe;
 *   click en el mismo valor elimina el chip (toggle).
 * - `mergeResolvedVariables` fusiona lo que el backend ha entendido del
 *   mensaje sin borrar lo que ya había.
 */
export function useVariableChips(): UseVariableChipsReturn {
  const [activeVariables, setActiveVariables] = useState<
    Record<string, string>
  >({});

  const hasIdentifyingVariables = useMemo(
    () => Object.keys(activeVariables).some(isIdentifyingVariable),
    [activeVariables],
  );

  const handleVariableClick = useCallback(
    (variable: string, value: string) => {
      setActiveVariables((prev) => {
        if (prev[variable] === value) {
          const next = { ...prev };
          delete next[variable];
          return next;
        }
        return { ...prev, [variable]: value };
      });
    },
    [],
  );

  const handleVariableRemove = useCallback((variable: string) => {
    setActiveVariables((prev) => {
      const next = { ...prev };
      delete next[variable];
      return next;
    });
  }, []);

  const mergeResolvedVariables = useCallback(
    (resolved: Record<string, string>) => {
      if (!resolved || Object.keys(resolved).length === 0) return;
      setActiveVariables((prev) => ({ ...prev, ...resolved }));
    },
    [],
  );

  const clear = useCallback(() => {
    setActiveVariables({});
  }, []);

  return {
    activeVariables,
    hasIdentifyingVariables,
    handleVariableClick,
    handleVariableRemove,
    mergeResolvedVariables,
    clear,
  };
}
