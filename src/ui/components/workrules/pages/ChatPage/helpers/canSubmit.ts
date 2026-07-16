import type { Convenio } from '../ChatPage.types';

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
