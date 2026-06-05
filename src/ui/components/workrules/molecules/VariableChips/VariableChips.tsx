import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface VariableChip {
  /** Clave de la variable (ej: "categoria", "tipo_establecimiento") */
  name: string;
  /** Etiqueta legible del grupo (ej: "Categoría") */
  label: string;
  /** Valor seleccionado (ej: "Camarero/a") */
  value: string;
}

export interface VariableChipsProps {
  chips: VariableChip[];
  onRemove: (name: string) => void;
  className?: string;
}

/**
 * Lista de chips estructurados que viajan en `ChatRequest.variables`.
 * Reemplazo por grupo: el estado padre garantiza una sola variable por `name`.
 * El usuario solo puede eliminar (X). Para cambiar valor, click en el panel.
 */
export function VariableChips({
  chips,
  onRemove,
  className,
}: VariableChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 px-2 pb-2",
        className,
      )}
      data-testid="variable-chips"
    >
      {chips.map((chip) => (
        <span
          key={chip.name}
          className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground"
        >
          <span className="text-muted-foreground">{chip.label}:</span>
          <span>{chip.value}</span>
          <button
            type="button"
            onClick={() => onRemove(chip.name)}
            aria-label={`Eliminar ${chip.label}`}
            className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );
}
