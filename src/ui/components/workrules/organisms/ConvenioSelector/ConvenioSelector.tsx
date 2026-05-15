/**
 * ConvenioSelector - Combobox con búsqueda fuzzy para seleccionar convenios colectivos
 *
 * Permite al usuario buscar y seleccionar un convenio de una lista usando filtrado fuzzy.
 * Muestra el convenio seleccionado como un chip removible debajo del selector.
 *
 * Características:
 * - Búsqueda fuzzy que normaliza acentos y permite matches no consecutivos
 * - Badges de ámbito con colores diferenciados (estatal/provincial/empresa)
 * - Skeleton state durante carga
 * - Chip removible para el convenio seleccionado
 */

import { cn } from '@/lib/utils';
import { Badge } from '@/ui/components/shadcn/badge';
import { Button } from '@/ui/components/shadcn/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/ui/components/shadcn/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/ui/components/shadcn/popover';
import { Skeleton } from '@/ui/components/shadcn/skeleton';
import { ConvenioChip } from '@/ui/components/workrules/atoms/ConvenioChip/ConvenioChip';
import type { Convenio } from '@core/types';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface ConvenioSelectorProps {
  /** Convenio actualmente seleccionado */
  selectedConvenio?: Convenio | null;
  /** Lista de convenios disponibles para seleccionar */
  convenios: Convenio[];
  /** Si true, muestra skeleton en lugar del selector */
  isLoading?: boolean;
  /** Callback cuando se selecciona un convenio */
  onSelect: (convenio: Convenio) => void;
  /** Callback cuando se limpia la selección */
  onClear: () => void;
  /** Texto placeholder cuando no hay selección */
  placeholder?: string;
  /** Clases CSS adicionales */
  className?: string;
}

/**
 * Normaliza un texto eliminando acentos y convirtiéndolo a minúsculas
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Busca coincidencias fuzzy entre el texto y la query
 * Los caracteres de la query deben aparecer en orden pero no necesariamente consecutivos
 *
 * @example
 * fuzzyMatch("Convenio Estatal", "cest") // true
 * fuzzyMatch("Convenio Provincial", "cest") // false
 */
function fuzzyMatch(text: string, query: string): boolean {
  const normalizedText = normalizeText(text);
  const normalizedQuery = normalizeText(query);

  let queryIndex = 0;
  for (const char of normalizedText) {
    if (char === normalizedQuery[queryIndex]) {
      queryIndex++;
    }
    if (queryIndex === normalizedQuery.length) {
      return true;
    }
  }
  return false;
}

/**
 * Obtiene el color del badge según el ámbito del convenio
 */
function getAmbitoBadgeClasses(ambito: Convenio['ambito']): string {
  switch (ambito) {
    case 'estatal':
      return 'bg-[var(--colorsAccentAccent2)] text-[var(--colorsAccentAccent12)] border border-[var(--colorsAccentAccent9)]';
    case 'provincial':
      return 'bg-[var(--colorsSemanticSuccess1)] text-[var(--colorsSemanticSuccess12)] border border-[var(--colorsSemanticSuccess9)]';
    case 'empresa':
      return 'bg-[var(--colorsSemanticInfo1)] text-[var(--colorsSemanticInfo12)] border border-[var(--colorsSemanticInfo9)]';
    default:
      return 'bg-muted text-muted-foreground border border-border';
  }
}

/**
 * Obtiene el texto legible del ámbito
 */
function getAmbitoLabel(ambito: Convenio['ambito']): string {
  switch (ambito) {
    case 'estatal':
      return 'Estatal';
    case 'provincial':
      return 'Provincial';
    case 'empresa':
      return 'Empresa';
    default:
      return 'Sin ámbito';
  }
}

/**
 * Devuelve el nombre legible del convenio para mostrar en el selector.
 * Prioriza la etiqueta corta extraída por el indexer; cae al nombre oficial
 * y, en último término, al nombre del PDF mientras el indexado no ha terminado.
 */
function getDisplayName(convenio: Convenio): string {
  const corto = convenio.nombre_corto?.trim();
  const oficial = convenio.nombre_oficial?.trim();
  const territorial = convenio.ambito_territorial?.trim();
  const base = corto || oficial;

  if (base && territorial) return `${base} — ${territorial}`;
  if (base) return base;
  return convenio.nombre;
}

/**
 * Nombre completo del convenio para usar como tooltip (atributo title).
 * Siempre incluye el nombre oficial cuando existe, sin recortar.
 */
function getFullName(convenio: Convenio): string {
  const oficial = convenio.nombre_oficial?.trim();
  const territorial = convenio.ambito_territorial?.trim();

  if (oficial && territorial) return `${oficial} — ${territorial}`;
  if (oficial) return oficial;
  return convenio.nombre;
}

export function ConvenioSelector({
  selectedConvenio,
  convenios,
  isLoading = false,
  onSelect,
  onClear,
  placeholder = 'Buscar convenio...',
  className,
}: ConvenioSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Limpiar la búsqueda cuando se cierra el popover
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
    }
  }, [open]);

  // Filtrar convenios según la búsqueda fuzzy
  const filteredConvenios = searchQuery
    ? convenios.filter((convenio) => {
        const searchableText = [
          convenio.nombre,
          convenio.nombre_oficial,
          convenio.nombre_corto,
          convenio.ambito,
          convenio.ambito_territorial,
        ]
          .filter(Boolean)
          .join(' ');
        return fuzzyMatch(searchableText, searchQuery);
      })
    : convenios;

  const handleSelect = (convenio: Convenio) => {
    onSelect(convenio);
    setOpen(false);
  };

  const handleClear = () => {
    onClear();
  };

  // Skeleton state
  if (isLoading) {
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Seleccionar convenio colectivo"
            className={cn(
              'w-full justify-between px-3 py-2 md:px-4 md:py-3',
              !selectedConvenio && 'text-muted-foreground'
            )}
          >
            <span
              className="truncate max-w-[120px] sm:max-w-[200px] md:max-w-none"
              title={selectedConvenio ? getFullName(selectedConvenio) : undefined}
            >
              {selectedConvenio ? getDisplayName(selectedConvenio) : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[90vw] max-w-[400px] p-0 bg-[var(--panelSolid)]" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar convenio..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>No se encontraron convenios.</CommandEmpty>
              <CommandGroup>
                {filteredConvenios.map((convenio) => (
                  <CommandItem
                    key={convenio.id}
                    value={convenio.id}
                    onSelect={() => handleSelect(convenio)}
                    data-checked={selectedConvenio?.id === convenio.id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Check
                      className={cn(
                        'h-4 w-4',
                        selectedConvenio?.id === convenio.id
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-1 items-center justify-between gap-2">
                      <span
                        className="flex-1 truncate text-sm min-w-0"
                        title={getFullName(convenio)}
                      >
                        {getDisplayName(convenio)}
                      </span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-[0.65rem] font-medium',
                          getAmbitoBadgeClasses(convenio.ambito)
                        )}
                      >
                        {getAmbitoLabel(convenio.ambito)}
                      </Badge>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedConvenio && (
        <div className="flex items-center">
          <ConvenioChip
            nombre={getDisplayName(selectedConvenio)}
            ambito={selectedConvenio.ambito as 'estatal' | 'provincial' | 'empresa' | undefined}
            removable
            onRemove={handleClear}
          />
        </div>
      )}
    </div>
  );
}
