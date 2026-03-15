import { cn } from '@/lib/utils';
import { UserConvenio } from '@core/types';
import {
  UploadIcon,
  MoreVerticalIcon,
  PencilIcon,
  TrashIcon,
  StarIcon,
  FileTextIcon,
  LockIcon,
  GlobeIcon,
  LoaderIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ClockIcon,
} from 'lucide-react';
import { Button } from '@ui/components/shadcn/button';
import { Badge } from '@ui/components/shadcn/badge';
import { ScrollArea } from '@ui/components/shadcn/scroll-area';
import { Separator } from '@ui/components/shadcn/separator';
import { Skeleton } from '@ui/components/shadcn/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ui/components/shadcn/dropdown-menu';

export interface ConvenioManagerProps {
  userConvenios: UserConvenio[];
  isLoading?: boolean;
  onUpload: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  className?: string;
}

const statusConfig = {
  pending: {
    icon: ClockIcon,
    label: 'Pendiente',
    className: 'bg-[var(--colorsSemanticInfo4)] text-[var(--colorsSemanticInfo11)]',
  },
  processing: {
    icon: LoaderIcon,
    label: 'Procesando',
    className: 'bg-[var(--colorsSemanticWarning4)] text-[var(--colorsSemanticWarning11)]',
  },
  ready: {
    icon: CheckCircleIcon,
    label: 'Listo',
    className: 'bg-[var(--colorsSemanticSuccess4)] text-[var(--colorsSemanticSuccess11)]',
  },
  error: {
    icon: AlertCircleIcon,
    label: 'Error',
    className: 'bg-[var(--colorsSemanticError4)] text-[var(--colorsSemanticError11)]',
  },
};

export function ConvenioManager({
  userConvenios,
  isLoading = false,
  onUpload,
  onEdit,
  onDelete,
  onToggleFavorite,
  className,
}: ConvenioManagerProps) {
  if (isLoading) {
    return (
      <div className={cn('flex flex-col', className)}>
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
              className="p-3 rounded-[var(--radius3)] border border-[var(--colorsNeutralNeutral6)] bg-[var(--colorsNeutralNeutral1)]"
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
    <div className={cn('flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[var(--typographyFontSize5)] font-[var(--typographyFontWeightBold)] text-[var(--colorsNeutralNeutral12)]">
          Mis convenios
        </h2>
        <Button
          onClick={onUpload}
          className="inline-flex items-center gap-2"
          size="sm"
        >
          <UploadIcon className="h-4 w-4" />
          Subir convenio
        </Button>
      </div>

      <Separator className="mb-4" />

      {/* Empty state */}
      {userConvenios.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 rounded-full bg-[var(--colorsNeutralNeutral3)] p-4">
            <FileTextIcon className="h-8 w-8 text-[var(--colorsNeutralNeutral11)]" />
          </div>
          <p className="text-[var(--typographyFontSize3)] font-[var(--typographyFontWeightMedium)] text-[var(--colorsNeutralNeutral12)] mb-2">
            No tienes convenios subidos
          </p>
          <p className="text-[var(--typographyFontSize2)] text-[var(--colorsNeutralNeutral11)] max-w-sm">
            Sube tu primer convenio en PDF y podrás consultarlo con IA
          </p>
        </div>
      ) : (
        /* List of convenios */
        <ScrollArea className="max-h-[400px] pr-4">
          <ul className="space-y-3">
            {userConvenios.map((convenio) => {
              const StatusIcon = statusConfig[convenio.status].icon;
              const statusLabel = statusConfig[convenio.status].label;
              const statusClassName = statusConfig[convenio.status].className;
              const isProcessing = convenio.status === 'processing';

              return (
                <li
                  key={convenio.id}
                  className="p-3 rounded-[var(--radius3)] border border-[var(--colorsNeutralNeutral6)] bg-[var(--colorsNeutralNeutral1)] hover:bg-[var(--colorsNeutralNeutral2)] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Left section: icon + info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Privacy icon */}
                      <div className="mt-1 flex-shrink-0">
                        {convenio.isPrivate ? (
                          <LockIcon className="h-4 w-4 text-[var(--colorsNeutralNeutral11)]" />
                        ) : (
                          <GlobeIcon className="h-4 w-4 text-[var(--colorsNeutralNeutral11)]" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Name + favorite */}
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-[var(--typographyFontSize3)] font-[var(--typographyFontWeightMedium)] text-[var(--colorsNeutralNeutral12)] truncate">
                            {convenio.nombre}
                          </h3>
                          {convenio.isFavorite && (
                            <StarIcon className="h-4 w-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                          )}
                        </div>

                        {/* Sector */}
                        <p className="text-[var(--typographyFontSize1)] text-[var(--colorsNeutralNeutral11)] mb-2">
                          {convenio.sector}
                        </p>

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
                          <p className="text-[var(--typographyFontSize1)] text-[var(--colorsSemanticError11)] mt-2">
                            {convenio.errorMessage}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right section: dropdown menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 flex-shrink-0"
                        >
                          <MoreVerticalIcon className="h-4 w-4" />
                          <span className="sr-only">Abrir menú</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => onToggleFavorite(convenio.id)}
                        >
                          <StarIcon className="h-4 w-4 mr-2" />
                          {convenio.isFavorite
                            ? 'Quitar de favoritos'
                            : 'Marcar como favorito'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onEdit(convenio.id)}
                          disabled={convenio.status !== 'ready'}
                        >
                          <PencilIcon className="h-4 w-4 mr-2" />
                          Editar nombre
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete(convenio.id)}
                          className="text-[var(--colorsSemanticError11)]"
                        >
                          <TrashIcon className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      )}
    </div>
  );
}
