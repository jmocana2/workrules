import { cn } from '@/lib/utils';
import { Button } from '@/ui/components/shadcn/button';
import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '@core/stores/themeStore';

export interface ThemeToggleProps {
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
  lg: 'h-10 w-10',
};

const iconSizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

const ThemeToggle = ({
  showLabel = false,
  size = 'md',
  className,
}: ThemeToggleProps) => {
  const { theme, toggleTheme } = useThemeStore();

  // El icono muestra el tema CONTRARIO (a qué vas a cambiar)
  const ThemeIcon = theme === 'dark' ? Sun : Moon;
  const nextThemeLabel = theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
  const currentThemeLabel = theme === 'dark' ? 'Modo oscuro' : 'Modo claro';

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        aria-label={nextThemeLabel}
        title={nextThemeLabel}
        className={cn(
          sizeClasses[size],
          'hover:bg-[var(--colorsNeutralNeutral3)] transition-colors duration-200'
        )}
      >
        <ThemeIcon
          className={cn(
            iconSizeClasses[size],
            'transition-all duration-200',
            'hover:scale-110'
          )}
        />
      </Button>
      {showLabel && (
        <span className="text-sm font-medium text-[var(--tokensColorsText)]">
          {currentThemeLabel}
        </span>
      )}
    </div>
  );
};

export default ThemeToggle;
