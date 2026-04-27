import { Button } from '@/ui/components/shadcn/button';
import { useThemeStore } from '@core/stores/themeStore';
import type { Meta, StoryObj } from '@storybook/react-vite';
import ThemeToggle from './ThemeToggle';

const meta: Meta<typeof ThemeToggle> = {
  title: 'workrules/atoms/ThemeToggle',
  component: ThemeToggle,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Componente toggle para cambiar el tema de la aplicación entre claro y oscuro. Usa Zustand para gestión de estado y persiste la preferencia en localStorage.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    showLabel: {
      control: 'boolean',
      description: 'Mostrar texto descriptivo junto al botón',
    },
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
      description: 'Tamaño del botón',
    },
    className: {
      control: 'text',
      description: 'Clases CSS adicionales',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ThemeToggle>;

/**
 * Configuración por defecto del ThemeToggle.
 * Persiste la preferencia en localStorage usando el themeStore.
 */
export const Default: Story = {
  args: {
    size: 'md',
    showLabel: false,
  },
};

/**
 * ThemeToggle con etiqueta visible mostrando el tema actual.
 */
export const WithLabel: Story = {
  args: {
    showLabel: true,
    size: 'md',
  },
};

/**
 * Comparación de los tres tamaños disponibles.
 */
export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-6 p-8 rounded-lg bg-[var(--tokensColorsPageBackground)] border">
      <div className="flex flex-col items-center gap-2">
        <ThemeToggle size="sm" showLabel />
        <span className="text-xs text-[var(--tokensColorsText)]">Small</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <ThemeToggle size="md" showLabel />
        <span className="text-xs text-[var(--tokensColorsText)]">Medium</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <ThemeToggle size="lg" showLabel />
        <span className="text-xs text-[var(--tokensColorsText)]">Large</span>
      </div>
    </div>
  ),
};

/**
 * Demostración interactiva con controles para forzar el tema.
 * Muestra cómo se puede manipular el themeStore desde otros componentes.
 */
export const Interactive: Story = {
  render: () => {
    const { theme, setTheme } = useThemeStore();

    return (
      <div className="flex flex-col items-center gap-6 p-8 rounded-lg bg-[var(--tokensColorsPageBackground)] border">
        <div className="text-center">
          <div className="text-sm font-medium mb-2 text-[var(--tokensColorsText)]">
            Tema actual: <span className="font-bold">{theme}</span>
          </div>
          <ThemeToggle showLabel size="md" />
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTheme('light')}
          >
            Forzar Light
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTheme('dark')}
          >
            Forzar Dark
          </Button>
        </div>
      </div>
    );
  },
};

/**
 * Ejemplo de uso en un header de aplicación.
 */
export const InHeader: Story = {
  render: () => (
    <header className="w-full border-b bg-[var(--tokensColorsPageBackground)]">
      <div className="container flex items-center justify-between h-16 px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-[var(--colorsAccentAccent9)]" />
          <span className="text-lg font-semibold text-[var(--tokensColorsText)]">WorkRules</span>
        </div>

        <nav className="flex items-center gap-6">
          <a href="#" className="text-sm font-medium text-[var(--tokensColorsText)] hover:text-[var(--colorsAccentAccent9)] transition-colors">
            Inicio
          </a>
          <a href="#" className="text-sm font-medium text-[var(--tokensColorsText)] hover:text-[var(--colorsAccentAccent9)] transition-colors">
            Consultas
          </a>
          <a href="#" className="text-sm font-medium text-[var(--tokensColorsText)] hover:text-[var(--colorsAccentAccent9)] transition-colors">
            Documentos
          </a>
        </nav>

        <div className="flex items-center gap-4">
          <ThemeToggle size="md" />
          <Button size="sm">
            Mi cuenta
          </Button>
        </div>
      </div>
    </header>
  ),
  parameters: {
    layout: 'fullscreen',
  },
};

/**
 * Ejemplo de uso en un footer de sidebar (como en WorkRules).
 */
export const InSidebarFooter: Story = {
  render: () => (
    <div className="w-64 border rounded-lg overflow-hidden">
      {/* Simular contenido de sidebar */}
      <div className="h-64 bg-[var(--colorsNeutralNeutral2)] p-4">
        <div className="text-sm text-[var(--tokensColorsText)]">Sidebar content...</div>
      </div>

      {/* Footer con ThemeToggle */}
      <footer className="flex items-center justify-between border-t border-[var(--colorsNeutralNeutral6)] p-4 bg-[var(--tokensColorsPageBackground)]">
        <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-[var(--colorsNeutralNeutral3)] text-[var(--tokensColorsText)]">
          <span className="font-semibold">Free</span>
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle size="md" />
          <Button variant="ghost" size="icon" className="h-9 w-9">
            ⚙️
          </Button>
        </div>
      </footer>
    </div>
  ),
};

/**
 * Demostración de los dos estados del tema.
 */
import { useEffect } from 'react';

export const DarkMode: Story = {
  decorators: [
    (Story) => {
      useEffect(() => {
        const previousTheme = useThemeStore.getState().theme;
        const previousDataset = document.documentElement.dataset.theme;
        
        useThemeStore.setState({ theme: 'dark' });
        document.documentElement.dataset.theme = 'dark';
        
        return () => {
          useThemeStore.setState({ theme: previousTheme });
          document.documentElement.dataset.theme = previousDataset || '';
        };
      }, []);
      
      return <Story />;
    },
  ],
  render: () => (
    <div className="flex flex-col items-center gap-3 p-6 rounded-lg border bg-[var(--tokensColorsPageBackground)]">
      <div className="text-sm font-medium text-[var(--tokensColorsText)] mb-2">
        Modo Oscuro
      </div>
      <ThemeToggle showLabel size="md" />
    </div>
  ),
};

/**
 * Demostración en modo claro.
 */
export const LightMode: Story = {
  decorators: [
    (Story) => {
      useEffect(() => {
        const previousTheme = useThemeStore.getState().theme;
        const previousDataset = document.documentElement.dataset.theme;
        
        useThemeStore.setState({ theme: 'light' });
        document.documentElement.dataset.theme = 'light';
        
        return () => {
          useThemeStore.setState({ theme: previousTheme });
          document.documentElement.dataset.theme = previousDataset || '';
        };
      }, []);
      
      return <Story />;
    },
  ],
  render: () => (
    <div className="flex flex-col items-center gap-3 p-6 rounded-lg border bg-[var(--tokensColorsPageBackground)]">
      <div className="text-sm font-medium text-[var(--tokensColorsText)] mb-2">
        Modo Claro
      </div>
      <ThemeToggle showLabel size="md" />
    </div>
  ),
};