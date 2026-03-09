import { cn } from '@/lib/utils';
import { Button } from '@/ui/components/shadcn/button';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeToggleProps {
  theme?: Theme;
  onChange?: (theme: Theme) => void;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  includeSystem?: boolean;
  className?: string;
}

const THEME_STORAGE_KEY = 'wr-theme';

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

const themeLabels: Record<Theme, string> = {
  light: 'Modo claro',
  dark: 'Modo oscuro',
  system: 'Automático',
};

const getThemeIcon = (theme: Theme) => {
  if (theme === 'light') return Sun;
  if (theme === 'dark') return Moon;
  return Monitor;
};

const getNextTheme = (currentTheme: Theme, includeSystem: boolean): Theme => {
  if (!includeSystem) {
    return currentTheme === 'light' ? 'dark' : 'light';
  }

  const cycle: Theme[] = ['light', 'dark', 'system'];
  const currentIndex = cycle.indexOf(currentTheme);
  return cycle[(currentIndex + 1) % cycle.length];
};

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const resolveTheme = (theme: Theme): 'light' | 'dark' => {
  return theme === 'system' ? getSystemTheme() : theme;
};

const applyTheme = (theme: Theme) => {
  const resolvedTheme = resolveTheme(theme);
  const root = document.documentElement;

  if (resolvedTheme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

const ThemeToggle = ({
  theme: controlledTheme,
  onChange,
  showLabel = false,
  size = 'md',
  includeSystem = false,
  className,
}: ThemeToggleProps) => {
  // Estado interno para modo no controlado
  const [uncontrolledTheme, setUncontrolledTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
    return stored && ['light', 'dark', 'system'].includes(stored) ? stored : 'light';
  });

  // Determinar si estamos en modo controlado
  const isControlled = controlledTheme !== undefined;
  const currentTheme = isControlled ? controlledTheme : uncontrolledTheme;

  // Aplicar tema al montar y cuando cambie
  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  // Escuchar cambios en preferencias del sistema si el tema es 'system'
  useEffect(() => {
    if (currentTheme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      applyTheme('system');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [currentTheme]);

  // Persistir en localStorage (solo en modo no controlado)
  useEffect(() => {
    if (!isControlled && typeof window !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
    }
  }, [currentTheme, isControlled]);

  const handleToggle = () => {
    const nextTheme = getNextTheme(currentTheme, includeSystem);

    if (isControlled && onChange) {
      onChange(nextTheme);
    } else if (isControlled && !onChange) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('ThemeToggle: `theme` prop provided without `onChange`. Button will have no effect.');
      }
    } else {
      setUncontrolledTheme(nextTheme);
      if (onChange) {
        onChange(nextTheme);
      }
    }
  };
  const nextTheme = getNextTheme(currentTheme, includeSystem);
  const nextThemeLabel = themeLabels[nextTheme];

  const ThemeIcon = getThemeIcon(currentTheme);

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        aria-label={`Cambiar a ${nextThemeLabel}`}
        title={`Cambiar a ${nextThemeLabel}`}
        className={cn(sizeClasses[size])}
      >
        <ThemeIcon className={cn(iconSizeClasses[size], 'transition-transform duration-200')} />
      </Button>
      {showLabel && (
        <span className="text-sm font-medium text-foreground">
          {themeLabels[currentTheme]}
        </span>
      )}
    </div>
  );
};

export default ThemeToggle;
