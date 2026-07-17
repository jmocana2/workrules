import type { Convenio } from '../ChatPage.types';

/**
 * Regla de habilitación del submit del prompt: exige convenio seleccionado y
 * o bien texto no vacío o bien modo salario activo con variables identificativas.
 */
export function canSubmit({
  text,
  selectedConvenio,
  salaryMode,
  hasIdentifyingVariables,
}: {
  text: string;
  selectedConvenio: Convenio | null;
  salaryMode: boolean;
  hasIdentifyingVariables: boolean;
}): boolean {
  return (
    !!selectedConvenio &&
    (text.trim().length > 0 || (salaryMode && hasIdentifyingVariables))
  );
}
