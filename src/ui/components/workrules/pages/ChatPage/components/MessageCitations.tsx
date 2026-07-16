import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '@ui/components/ai-elements/sources';
import { BookIcon, ExternalLinkIcon } from 'lucide-react';
import type { Citation } from '../ChatPage.types';

interface MessageCitationsProps {
  citations: NonNullable<Citation[]>;
  convenioId?: string | null;
  onOpenPdf: (convenioId: string, options?: { page?: number | null }) => void;
  hidePerCitationLinks?: boolean;
}

export function MessageCitations({
  citations,
  convenioId,
  onOpenPdf,
  hidePerCitationLinks = false,
}: MessageCitationsProps) {
  const uniqueCitations = citations.filter(
    (c, i, arr) =>
      arr.findIndex((x) => x.source === c.source && x.pagina === c.pagina) === i,
  );

  const handleOpen = (pagina?: number | null) => {
    if (convenioId) onOpenPdf(convenioId, { page: pagina ?? undefined });
  };

  const openPdfButton = convenioId ? (
    <button
      type="button"
      onClick={() => handleOpen(null)}
      aria-label="Abrir PDF original en una pestaña nueva"
      className="mt-3 flex items-center gap-2 text-primary hover:underline"
    >
      <ExternalLinkIcon className="h-4 w-4 shrink-0" />
      <span className="font-medium">Abrir PDF original</span>
    </button>
  ) : null;

  if (hidePerCitationLinks) {
    if (!openPdfButton) return null;
    return <div className="not-prose mb-4 text-primary text-xs">{openPdfButton}</div>;
  }

  return (
    <Sources>
      <SourcesTrigger count={uniqueCitations.length} />
      <SourcesContent>
        {uniqueCitations.map((citation, idx) =>
          convenioId ? (
            <button
              key={idx}
              type="button"
              onClick={() => handleOpen(citation.pagina)}
              aria-label={
                citation.pagina
                  ? `Abrir PDF oficial en la página ${citation.pagina} - ${citation.source}`
                  : `Abrir PDF oficial - ${citation.source}`
              }
              className="flex items-center gap-2 text-left hover:underline"
            >
              <BookIcon className="h-4 w-4 shrink-0" />
              <span className="block font-medium">{citation.source}</span>
              {citation.pagina && (
                <span className="text-muted-foreground">p. {citation.pagina}</span>
              )}
            </button>
          ) : (
            <Source
              key={idx}
              href={citation.url_pdf ?? citation.url}
              title={citation.source}
              pagina={citation.pagina ?? undefined}
            />
          ),
        )}
      </SourcesContent>
      {openPdfButton}
    </Sources>
  );
}
