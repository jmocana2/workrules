import { Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@ui/components/shadcn/switch";

export interface SalaryModeToggleProps {
  active: boolean;
  onToggle: (value: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function SalaryModeToggle({
  active,
  onToggle,
  disabled,
  className,
}: SalaryModeToggleProps) {
  const labelId = "salary-mode-toggle-label";
  return (
    <label
      className={cn(
        "flex items-center gap-2 text-xs font-medium select-none",
        active ? "text-foreground" : "text-muted-foreground",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        className,
      )}
    >
      <Calculator className="h-3.5 w-3.5" />
      <span id={labelId}>Cálculo salarial</span>
      <Switch
        checked={active}
        onCheckedChange={onToggle}
        disabled={disabled}
        aria-labelledby={labelId}
        size="sm"
      />
    </label>
  );
}
