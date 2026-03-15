import type { PerfilJson } from '@core/types';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@ui/components/shadcn/button';
import { useState } from 'react';
import { VariablesPanel } from './VariablesPanel';

const meta: Meta<typeof VariablesPanel> = {
  title: 'WorkRules/Organisms/VariablesPanel',
  component: VariablesPanel,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    perfilJson: {
      control: 'object',
      description: 'Perfil del convenio con variables críticas y valores posibles',
    },
    onVariableClick: { action: 'variableClicked' },
    onToggleCollapse: { action: 'toggleCollapse' },
    isCollapsed: {
      control: 'boolean',
      description: 'Estado colapsado del panel',
    },
  },
} satisfies Meta<typeof VariablesPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock data - Hostelería
const mockPerfilHosteleria: PerfilJson = {
  convenio: 'Hosteleria de Madrid',
  variables_criticas: [
    'Categoria Profesional',
    'Categoria Hotel',
    'Anos Antiguedad',
  ],
  valores_posibles: {
    'Categoria Profesional': [
      'Gobernanta',
      'Camarera de piso',
      'Recepcionista',
      'Cocinero',
      'Ayudante de cocina',
    ],
    'Categoria Hotel': ['3 estrellas', '4 estrellas', '5 estrellas', 'Gran Lujo'],
    'Anos Antiguedad': [
      '0-2 anos',
      '2-5 anos',
      '5-10 anos',
      'Mas de 10 anos',
    ],
  },
  descripciones: {
    'Categoria Profesional': 'Puesto de trabajo segun el convenio',
    'Categoria Hotel': 'Clasificacion del establecimiento',
  },
};

// Mock data - Consultoras TIC
const mockPerfilConsultorasTIC: PerfilJson = {
  convenio: 'Empresas de consultoria y estudios de mercado y opinion publica',
  variables_criticas: [
    'Grupo Profesional',
    'Nivel',
    'Tipo de Contrato',
  ],
  valores_posibles: {
    'Grupo Profesional': [
      'Tecnico',
      'Analista',
      'Consultor',
      'Consultor Senior',
      'Manager',
    ],
    'Nivel': ['I', 'II', 'III', 'IV', 'V'],
    'Tipo de Contrato': ['Indefinido', 'Temporal', 'Formacion', 'Practicas'],
  },
};

// Mock data - Sin valores en una variable
const mockPerfilSinValores: PerfilJson = {
  convenio: 'Convenio Ejemplo Sin Valores',
  variables_criticas: ['Variable Sin Datos', 'Variable Con Datos'],
  valores_posibles: {
    'Variable Sin Datos': [],
    'Variable Con Datos': ['Valor 1', 'Valor 2', 'Valor 3'],
  },
};

/**
 * Estado por defecto del panel con perfil de Hostelería de Madrid.
 * Incluye tooltips con descripciones en algunas variables.
 */
export const Default: Story = {
  args: {
    perfilJson: mockPerfilHosteleria,
    isCollapsed: false,
  },
  decorators: [
    (Story: React.ComponentType) => (
      <div className="flex h-screen items-stretch bg-background">
        <div className="flex-1" />
        <Story />
      </div>
    ),
  ],
};

/**
 * Panel con perfil de Consultoras TIC sin descripciones.
 * Muestra cómo se ve el panel sin tooltips de información.
 */
export const ConsultorasTIC: Story = {
  args: {
    perfilJson: mockPerfilConsultorasTIC,
    isCollapsed: false,
  },
  decorators: [
    (Story: React.ComponentType) => (
      <div className="flex h-screen items-stretch bg-background">
        <div className="flex-1" />
        <Story />
      </div>
    ),
  ],
};

/**
 * Estado sin convenio seleccionado.
 * Muestra mensaje de placeholder con ícono de información.
 */
export const NoConvenio: Story = {
  args: {
    perfilJson: null,
    isCollapsed: false,
  },
  decorators: [
    (Story: React.ComponentType) => (
      <div className="flex h-screen items-stretch bg-background">
        <div className="flex-1" />
        <Story />
      </div>
    ),
  ],
};

/**
 * Panel colapsado mostrando solo el botón de expandir.
 */
export const Collapsed: Story = {
  args: {
    perfilJson: mockPerfilHosteleria,
    isCollapsed: true,
  },
  decorators: [
    (Story: React.ComponentType) => (
      <div className="flex h-screen items-stretch bg-background">
        <div className="flex-1" />
        <Story />
      </div>
    ),
  ],
};

/**
 * Panel con variable sin valores.
 * Muestra el mensaje "Sin valores definidos" cuando una variable no tiene opciones.
 */
export const ConVariableSinValores: Story = {
  args: {
    perfilJson: mockPerfilSinValores,
    isCollapsed: false,
  },
  decorators: [
    (Story: React.ComponentType) => (
      <div className="flex h-screen items-stretch bg-background">
        <div className="flex-1" />
        <Story />
      </div>
    ),
  ],
};

/**
 * Panel interactivo con control de collapse.
 * Permite expandir/colapsar el panel y ver los clicks en variables.
 */
export const Interactive: Story = {
  render: () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [lastClick, setLastClick] = useState<string>('');

    const handleVariableClick = (variable: string, value: string) => {
      setLastClick(`${variable}: ${value}`);
      console.log('Variable clicked:', variable, value);
    };

    const handleToggleCollapse = () => {
      setIsCollapsed((prev) => !prev);
    };

    return (
      <div className="flex h-screen items-stretch bg-background">
        {/* Main content area */}
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
          <h1 className="text-2xl font-bold text-foreground">
            Panel de Variables Interactivo
          </h1>
          <p className="text-muted-foreground">
            Estado: {isCollapsed ? 'Colapsado' : 'Expandido'}
          </p>
          {lastClick && (
            <div className="rounded-lg border border-(--colorsAccentAccent6) bg-(--colorsAccentAccent3) p-4">
              <p className="text-sm text-(--colorsAccentAccent11)">
                Último click: <strong>{lastClick}</strong>
              </p>
            </div>
          )}
          <Button onClick={handleToggleCollapse} size="sm">
            {isCollapsed ? 'Expandir' : 'Colapsar'} Panel
          </Button>
        </div>

        {/* Variables Panel */}
        <VariablesPanel
          perfilJson={mockPerfilHosteleria}
          onVariableClick={handleVariableClick}
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      </div>
    );
  },
};
