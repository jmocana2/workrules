import { cn } from '@/lib/utils';
import { UserConvenio } from '@core/types';
import { Badge } from '@ui/components/shadcn/badge';
import { Button } from '@ui/components/shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ui/components/shadcn/dropdown-menu';
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
  MoreVerticalIcon,
  PencilIcon,
  StarIcon,
  TrashIcon,
  UploadIcon,
} from 'lucide-react';

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
  onEdit,
  onDelete,
  onToggleFavorite,
  className,
}: ConvenioManagerProps) {
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
        /* List of convenios */
        <div className="max-h-100 overflow-y-auto pr-4">
          <ul className="space-y-3">
            {userConvenios.map((convenio) => {
              const StatusIcon = statusConfig[convenio.status].icon;
              const statusLabel = statusConfig[convenio.status].label;
              const statusClassName = statusConfig[convenio.status].className;
              const isProcessing = convenio.status === 'processing';

              return (
                <li
                  key={convenio.id}
                  className="rounded-(--radius3) border border-border bg-card p-3 transition-colors hover:bg-muted"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Left section: icon + info */}
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
                        {/* Name + favorite */}
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="truncate text-(length:--typographyFontSize3) font-(--typographyFontWeightMedium) text-foreground">
                            {convenio.nombre}
                          </h3>
                          {convenio.isFavorite && (
                            <StarIcon className="h-4 w-4 fill-yellow-400 text-yellow-400 shrink-0" />
                          )}
                        </div>

                        {/* Sector */}
                        <p className="mb-2 text-(length:--typographyFontSize1) text-muted-foreground">
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
                          <p className="mt-2 text-(length:--typographyFontSize1) text-destructive">
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
                          className="h-8 w-8 shrink-0 p-0"
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
                          className="text-destructive"
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
        </div>
      )}
    </div>
  );
}
