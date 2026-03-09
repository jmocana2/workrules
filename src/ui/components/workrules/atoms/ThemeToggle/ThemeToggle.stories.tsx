import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import type { Theme } from './ThemeToggle';
import ThemeToggle from './ThemeToggle';

const meta: Meta<typeof ThemeToggle> = {
  title: 'workrules/atoms/ThemeToggle',
  component: ThemeToggle,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Componente toggle para cambiar el tema de la aplicación entre claro, oscuro y automático (según preferencias del sistema).',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    theme: {
      control: 'radio',
      options: ['light', 'dark', 'system'],
      description: 'Tema actual (modo controlado)',
    },
    onChange: {
      description: 'Callback cuando cambia el tema',
      action: 'onChange',
    },
    showLabel: {
      control: 'boolean',
      description: 'Mostrar texto descriptivo junto al botón',
    },
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
      description: 'Tamaño del botón',
    },
    includeSystem: {
      control: 'boolean',
      description: 'Incluir opción "Automático" en el ciclo',
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
 * En modo no controlado, persiste la preferencia en localStorage.
 */
export const Default: Story = {
  args: {
    size: 'md',
    showLabel: false,
    includeSystem: false,
  },
};

/**
 * ThemeToggle con etiqueta visible mostrando el tema actual.
 */
export const WithLabel: Story = {
  args: {
    showLabel: true,
    size: 'md',
    includeSystem: false,
  },
};

/**
 * ThemeToggle con opción de tema automático (system).
 * Ciclo: light -> dark -> system -> light
 */
export const WithSystemOption: Story = {
  args: {
    includeSystem: true,
    showLabel: true,
    size: 'md',
  },
};

/**
 * Comparación de los tres tamaños disponibles.
 */
export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-6 p-8 rounded-lg bg-background border">
      <div className="flex flex-col items-center gap-2">
        <ThemeToggle size="sm" showLabel />
        <span className="text-xs text-muted-foreground">Small</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <ThemeToggle size="md" showLabel />
        <span className="text-xs text-muted-foreground">Medium</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <ThemeToggle size="lg" showLabel />
        <span className="text-xs text-muted-foreground">Large</span>
      </div>
    </div>
  ),
};

/**
 * Modo controlado: el estado del tema es controlado externamente.
 * Útil cuando necesitas sincronizar el tema con otro estado.
 */
export const Controlled: Story = {
  render: () => {
    const [theme, setTheme] = useState<Theme>('light');

    return (
      <div className="flex flex-col items-center gap-6 p-8 rounded-lg bg-background border">
        <div className="text-center">
          <div className="text-sm font-medium text-foreground mb-2">
            Tema actual: <span className="font-bold text-primary">{theme}</span>
          </div>
          <ThemeToggle
            theme={theme}
            onChange={setTheme}
            includeSystem
            showLabel
            size="md"
          />
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <button
            onClick={() => setTheme('light')}
            className="px-3 py-1.5 text-sm rounded-md border hover:bg-muted transition-colors"
          >
            Set Light
          </button>
          <button
            onClick={() => setTheme('dark')}
            className="px-3 py-1.5 text-sm rounded-md border hover:bg-muted transition-colors"
          >
            Set Dark
          </button>
          <button
            onClick={() => setTheme('system')}
            className="px-3 py-1.5 text-sm rounded-md border hover:bg-muted transition-colors"
          >
            Set System
          </button>
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
    <header className="w-full border-b bg-background">
      <div className="container flex items-center justify-between h-16 px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-primary" />
          <span className="text-lg font-semibold">WorkRules</span>
        </div>

        <nav className="flex items-center gap-6">
          <a href="#" className="text-sm font-medium hover:text-primary transition-colors">
            Inicio
          </a>
          <a href="#" className="text-sm font-medium hover:text-primary transition-colors">
            Consultas
          </a>
          <a href="#" className="text-sm font-medium hover:text-primary transition-colors">
            Documentos
          </a>
        </nav>

        <div className="flex items-center gap-4">
          <ThemeToggle size="md" includeSystem />
          <button className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/80 transition-colors">
            Mi cuenta
          </button>
        </div>
      </div>
    </header>
  ),
  parameters: {
    layout: 'fullscreen',
  },
};

/**
 * Demostración de los tres estados del tema aplicados al componente.
 */
export const ThemeStates: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4 p-8">
      {(['light', 'dark', 'system'] as Theme[]).map((themeState) => (
        <div
          key={themeState}
          className="flex flex-col items-center gap-3 p-6 rounded-lg border bg-card"
        >
          <div className="text-sm font-medium text-card-foreground mb-2">
            {themeState.charAt(0).toUpperCase() + themeState.slice(1)}
          </div>
          <ThemeToggle theme={themeState} onChange={() => {}} showLabel size="md" includeSystem />
        </div>
      ))}
    </div>
  ),
};