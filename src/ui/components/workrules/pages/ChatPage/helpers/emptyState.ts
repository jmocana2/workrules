import { CHAT_TEXTS } from '@constants/texts';
import type { Convenio } from '../ChatPage.types';

export function getEmptyStateText(selectedConvenio: Convenio | null): {
  title: string;
  description: string;
} {
  if (selectedConvenio) {
    const convenioLabel =
      selectedConvenio.nombre_corto ||
      selectedConvenio.nombre_oficial ||
      selectedConvenio.nombre;
    return {
      title: CHAT_TEXTS.empty.withConvenio.title.replace('{convenio}', convenioLabel),
      description: CHAT_TEXTS.empty.withConvenio.description,
    };
  }
  return CHAT_TEXTS.empty.noConvenio;
}
