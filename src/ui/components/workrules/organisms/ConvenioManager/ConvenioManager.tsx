import { cn } from '@/lib/utils';
import { UserConvenio } from '@core/types';
import { Badge } from '@ui/components/shadcn/badge';
import { Button } from '@ui/components/shadcn/button';
import { Input } from '@ui/components/shadcn/input';
import { Separator } from '@ui/components/shadcn/separator';
import { Skeleton } from '@ui/components/shadcn/skeleton';
import {
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  FileTextIcon,
  GlobeIcon,
  LoaderIcon,
  LockIcon,
  SearchIcon,
  UploadIcon,
} from 'lucide-react';
import { useState } from 'react';
import { openPdfFileSelector } from '../ConvenioUploader/utils/fileSelection';

function normalizeText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function fuzzyMatch(text: string, query: string): boolean {
  const normalizedText = normalizeText(text);
  const normalizedQuery = normalizeText(query);
  let queryIndex = 0;
  for (const char of normalizedText) {
    if (char === normalizedQuery[queryIndex]) queryIndex++;
    if (queryIndex === normalizedQuery.length) return true;
  }
  return false;
}

function getDisplayName(convenio: UserConvenio): string {
  const corto = convenio.nombre_corto?.trim();
  const oficial = convenio.nombre_oficial?.trim();
  const territorial = convenio.ambito_territorial?.trim();
  const base = corto || oficial;
  if (base && territorial) return `${base} — ${territorial}`;
  if (base) return base;
  return convenio.nombre;
}

export interface ConvenioManagerProps {
  userConvenios: UserConvenio[];
  isLoading?: boolean;
  onUpload: (file: File) => void;
  onSelectConvenio: (convenioId: string) => void;
  className?: string;
}

const statusConfig = {
  pending: {
    icon: ClockIcon,
    label: 'Pendiente',
    className: 'bg-[var(--colorsSemanticInfo4)] text-[var(--colorsSemanticInfo12)]',
  },
  processing: {
    icon: LoaderIcon,
    label: 'Procesando',
    className: 'bg-[var(--colorsSemanticWarning4)] text-[var(--colorsSemanticWarning12)]',
  },
  ready: {
    icon: CheckCircleIcon,
    label: 'Listo',
    className: 'bg-[var(--colorsSemanticSuccess4)] text-[var(--colorsSemanticSuccess12)]',
  },
  error: {
    icon: AlertCircleIcon,
    label: 'Error',
    className: 'bg-[var(--colorsSemanticError4)] text-[var(--colorsSemanticError12)]',
  },
};

export function ConvenioManager({
  userConvenios,
  isLoading = false,
  onUpload,
  onSelectConvenio,
  className,
}: ConvenioManagerProps) {
  const [fileError, setFileError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConvenios = searchQuery
    ? userConvenios.filter((convenio) => {
        const searchableText = [
          convenio.nombre,
          convenio.nombre_oficial,
          convenio.nombre_corto,
          convenio.ambito_territorial,
          convenio.sector,
        ]
          .filter(Boolean)
          .join(' ');
        return fuzzyMatch(searchableText, searchQuery);
      })
    : userConvenios;

  const handleUploadClick = () => {
    setFileError(null);
    openPdfFileSelector(
      (file) => { onUpload(file); },
      (error) => { setFileError(error); },
    );
  };
  if (isLoading) {    

    return (
      <div className={cn('flex flex-col rounded-lg border border-border bg-background p-6', className)}>
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-36" />
        </div>

        {/* List skeletons */}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-(--radius3) border border-border bg-card p-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-6 w-24" />
                </div>
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col rounded-lg border border-border bg-background p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-(length:--typographyFontSize5) font-(--typographyFontWeightBold) text-foreground">
          Mis convenios
        </h2>
        <Button
          onClick={handleUploadClick}
          className="inline-flex items-center gap-2"
          size="sm"
        >
          <UploadIcon className="h-4 w-4" />
          Subir convenio
        </Button>
      </div>

      {fileError && (
        <div role="alert" className="mt-2 px-3 py-2 rounded-md border border-(--colorsSemanticError9) bg-(--colorsSemanticErrorAlpha3)">
          <p className="text-sm text-(--colorsSemanticError11)">{fileError}</p>
        </div>
      )}

      <Separator className="mb-4" />

      {/* Empty state */}
      {userConvenios.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 rounded-full bg-muted p-4">
            <FileTextIcon className="h-8 w-8 text-foreground" />
          </div>
          <p className="mb-2 text-(length:--typographyFontSize3) font-(--typographyFontWeightMedium) text-foreground">
            No tienes convenios subidos
          </p>
          <p className="max-w-sm text-(length:--typographyFontSize2) text-muted-foreground">
            Sube tu primer convenio en PDF y podrás consultarlo con IA
          </p>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="relative mb-3">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar convenio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* List of convenios */}
          <div className="max-h-96 overflow-y-auto pr-1">
            {filteredConvenios.length === 0 ? (
              <p className="py-8 text-center text-(length:--typographyFontSize2) text-muted-foreground">
                No se encontraron convenios.
              </p>
            ) : (
              <ul className="space-y-3">
                {filteredConvenios.map((convenio) => {
                  const StatusIcon = statusConfig[convenio.status].icon;
                  const statusLabel = statusConfig[convenio.status].label;
                  const statusClassName = statusConfig[convenio.status].className;
                  const isProcessing = convenio.status === 'processing';
                  const canSelect = convenio.status === 'ready';

                  return (
                    <li
                      key={convenio.id}
                      data-testid={`convenio-item-${convenio.id}`}
                      onClick={() => canSelect && onSelectConvenio(convenio.id)}
                      className={cn(
                        'rounded-(--radius3) border border-border bg-card p-3 transition-colors',
                        canSelect && 'cursor-pointer hover:bg-muted hover:border-primary',
                        !canSelect && 'opacity-60'
                      )}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Privacy icon */}
                        <div className="mt-1 shrink-0">
                          {convenio.isPrivate ? (
                            <LockIcon className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <GlobeIcon className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Name */}
                          <h3
                            className="truncate text-(length:--typographyFontSize3) font-(--typographyFontWeightMedium) text-foreground mb-1"
                            title={convenio.nombre_oficial?.trim() || convenio.nombre}
                          >
                            {getDisplayName(convenio)}
                          </h3>

                          {/* Sector */}
                          {convenio.sector && (
                            <p className="mb-2 text-(length:--typographyFontSize1) text-muted-foreground">
                              {convenio.sector}
                            </p>
                          )}

                          {/* Status badge */}
                          <Badge
                            variant="secondary"
                            className={cn(
                              'inline-flex items-center gap-1.5',
                              statusClassName
                            )}
                          >
                            <StatusIcon
                              className={cn(
                                'h-3.5 w-3.5',
                                isProcessing && 'animate-spin'
                              )}
                            />
                            {statusLabel}
                          </Badge>

                          {/* Error message */}
                          {convenio.status === 'error' && convenio.errorMessage && (
                            <p className="mt-2 text-(length:--typographyFontSize1) text-destructive">
                              {convenio.errorMessage}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
