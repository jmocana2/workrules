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

import { CHAT_TEXTS } from '@/constants/texts';
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
import { ChevronsUpDown } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

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
    case 'autonomico':
      return 'bg-[var(--colorsSemanticWarning1)] text-[var(--colorsSemanticWarning12)] border border-[var(--colorsSemanticWarning9)]';
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
    case 'autonomico':
      return 'Autonómico';
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
 * Incluye el año de `fecha_vigencia` cuando está disponible para diferenciar
 * versiones del mismo convenio.
 */
function buildSufijo(territorial: string | undefined, anio: number | null): string {
  if (territorial && anio) return `${territorial} · ${anio}`;
  if (territorial) return territorial;
  if (anio) return String(anio);
  return '';
}

function getDisplayName(convenio: Convenio): string {
  const corto = convenio.nombre_corto?.trim();
  const oficial = convenio.nombre_oficial?.trim();
  const territorial = convenio.ambito_territorial?.trim();
  const base = corto || oficial;
  const anio = getAnio(convenio);

  const sufijo = buildSufijo(territorial, anio);

  if (base && sufijo) return `${base} — ${sufijo}`;
  if (base) return base;
  if (sufijo) return `${convenio.nombre} — ${sufijo}`;
  return convenio.nombre;
}

/**
 * Extrae el año a mostrar. Usa `fecha_vigencia` si existe; si no, no muestra
 * año (se descarta `created_at` para no confundir "año de subida" con "año de
 * vigencia").
 */
function getAnio(convenio: Convenio): number | null {
  if (!convenio.fecha_vigencia) return null;
  const d = new Date(convenio.fecha_vigencia);
  const y = d.getFullYear();
  return Number.isFinite(y) ? y : null;
}

/**
 * Clave que agrupa convenios de la misma "familia" (misma norma en distintas
 * versiones/años). Se prefiere `codigo_regcon`, que es el identificador oficial
 * del Registro de Convenios; como fallback se combina nombre corto y ámbito
 * territorial.
 */
function getFamiliaKey(convenio: Convenio): string {
  const regcon = convenio.codigo_regcon?.trim();
  if (regcon) return `regcon:${regcon}`;
  const nombre = (convenio.nombre_corto || convenio.nombre_oficial || convenio.nombre)
    ?.trim()
    .toLowerCase() ?? '';
  const territorial = convenio.ambito_territorial?.trim().toLowerCase() ?? '';
  return `nom:${nombre}|${territorial}`;
}

/**
 * Devuelve el conjunto de ids de convenios que son la versión más reciente
 * dentro de su familia. Un convenio sin `fecha_vigencia` no se considera
 * "vigente" salvo que sea el único de su familia.
 */
function groupByFamilia(convenios: Convenio[]): Map<string, Convenio[]> {
  const grupos = new Map<string, Convenio[]>();
  for (const c of convenios) {
    const key = getFamiliaKey(c);
    const arr = grupos.get(key);
    if (arr) arr.push(c);
    else grupos.set(key, [c]);
  }
  return grupos;
}

function pickVigenteId(grupo: Convenio[]): string | null {
  if (grupo.length === 1) return grupo[0].id;
  let mejorId: string | null = null;
  let mejorTs = -Infinity;
  for (const c of grupo) {
    const ts = c.fecha_vigencia ? new Date(c.fecha_vigencia).getTime() : NaN;
    if (Number.isFinite(ts) && ts > mejorTs) {
      mejorId = c.id;
      mejorTs = ts;
    }
  }
  return mejorId;
}

function computeVigentes(convenios: Convenio[]): Set<string> {
  const vigentes = new Set<string>();
  for (const grupo of groupByFamilia(convenios).values()) {
    const id = pickVigenteId(grupo);
    if (id) vigentes.add(id);
  }
  return vigentes;
}

/**
 * Ordena los convenios de forma estable: agrupa por familia y, dentro de cada
 * familia, coloca primero el más reciente por `fecha_vigencia DESC`. El orden
 * entre familias respeta la primera aparición del input.
 */
function sortConvenios(convenios: Convenio[]): Convenio[] {
  const orden = new Map<string, number>();
  const grupos = new Map<string, Convenio[]>();
  convenios.forEach((c, i) => {
    const key = getFamiliaKey(c);
    if (!orden.has(key)) orden.set(key, i);
    const arr = grupos.get(key);
    if (arr) arr.push(c);
    else grupos.set(key, [c]);
  });

  const familias = Array.from(grupos.entries()).sort(
    ([a], [b]) => (orden.get(a) ?? 0) - (orden.get(b) ?? 0)
  );

  const out: Convenio[] = [];
  for (const [, grupo] of familias) {
    grupo.sort((a, b) => {
      const ta = a.fecha_vigencia ? new Date(a.fecha_vigencia).getTime() : -Infinity;
      const tb = b.fecha_vigencia ? new Date(b.fecha_vigencia).getTime() : -Infinity;
      return tb - ta;
    });
    out.push(...grupo);
  }
  return out;
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
  placeholder = CHAT_TEXTS.convenioSelector.placeholder,
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

  // Familia -> id del convenio vigente. Recalculado solo cuando cambia la lista.
  const vigentes = useMemo(() => computeVigentes(convenios), [convenios]);
  const sortedConvenios = useMemo(() => sortConvenios(convenios), [convenios]);

  // Filtrar convenios según la búsqueda fuzzy
  const filteredConvenios = searchQuery
    ? sortedConvenios.filter((convenio) => {
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
    : sortedConvenios;

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
              className="truncate"
              title={selectedConvenio ? getFullName(selectedConvenio) : undefined}
            >
              {selectedConvenio ? getDisplayName(selectedConvenio) : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[90vw] max-w-[415px] p-0 bg-[var(--panelSolid)]" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={CHAT_TEXTS.convenioSelector.searchPlaceholder}
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
                    className="flex items-center gap-2 cursor-pointer mb-[2px] hover:!bg-[var(--colorsAccentAccent4)]"
                  >
                   
                    <div className="flex flex-1 items-center justify-between gap-2 max-w-full">
                      <span
                        className="flex-1 truncate text-sm min-w-0 max-w-[260px]"
                        title={getFullName(convenio)}
                      >
                        {getDisplayName(convenio)}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[0.65rem] font-medium',
                            vigentes.has(convenio.id)
                              ? 'bg-[var(--colorsSemanticSuccess1)] text-[var(--colorsSemanticSuccess12)] border border-[var(--colorsSemanticSuccess9)]'
                              : 'bg-muted text-muted-foreground border border-border'
                          )}
                          title={
                            vigentes.has(convenio.id)
                              ? 'Versión más reciente detectada para este convenio'
                              : 'Existe una versión más reciente del mismo convenio'
                          }
                        >
                          {vigentes.has(convenio.id) ? 'Vigente' : 'Antiguo'}
                        </Badge>
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
            ambito={selectedConvenio.ambito as 'estatal' | 'autonomico' | 'provincial' | 'empresa' | undefined}
            removable
            onRemove={handleClear}
          />
        </div>
      )}
    </div>
  );
}
