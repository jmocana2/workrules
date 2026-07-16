import { useQueryClient } from '@tanstack/react-query';
import { useConvenioUploaderController } from '@ui/components/workrules/organisms/ConvenioUploader';

/**
 * Integra el uploader de convenios con la caché de TanStack Query: expone el
 * controller del upload y el callback que invalida `user-convenios` al terminar.
 *
 * Debe llamarse en el root de ChatPage (no dentro del Sidebar) para que el estado
 * del upload en curso sobreviva a los remounts del Sidebar cuando cambia el
 * breakpoint mobile/tablet/desktop (p.ej. al rotar el móvil).
 */
export function useConvenioUploadIntegration() {
  const queryClient = useQueryClient();

  const onConvenioUploaded = (_convenioId: string) => {
    queryClient.invalidateQueries({ queryKey: ['user-convenios'] });
  };

  const controller = useConvenioUploaderController({
    onConvenioReady: onConvenioUploaded,
  });

  return { controller, onConvenioUploaded };
}
