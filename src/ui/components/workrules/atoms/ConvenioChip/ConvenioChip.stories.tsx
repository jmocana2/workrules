import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ConvenioChip } from './ConvenioChip';

/**
 * ConvenioChip muestra chips de convenios colectivos con indicadores de ámbito
 *
 * - **Ámbito Estatal [E]**: Usa colores accent/teal del sistema de diseño
 * - **Ámbito Provincial [P]**: Usa colores success/green del sistema de diseño
 * - **Ámbito Empresa [Emp]**: Usa colores info/cyan del sistema de diseño
 * - Soporta estado seleccionado con ring de resaltado
 * - Modo removible con icono X
 * - Trunca nombres largos automáticamente
 */
const meta = {
  title: 'workrules/atoms/ConvenioChip',
  component: ConvenioChip,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Componente chip para mostrar convenios colectivos con indicadores visuales de ámbito. Basado en el componente Badge de shadcn con estilos personalizados del sistema de diseño WorkRules.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    ambito: {
      control: 'select',
      options: ['estatal', 'provincial', 'empresa'],
      description: 'Ámbito del convenio que determina el color y el indicador',
    },
    nombre: {
      control: 'text',
      description: 'Nombre del convenio colectivo a mostrar',
    },
    removable: {
      control: 'boolean',
      description: 'Si es true, muestra un botón X para eliminar el chip',
    },
    selected: {
      control: 'boolean',
      description: 'Si es true, muestra un anillo de resaltado alrededor del chip',
    },
    onClick: {
      description: 'Callback cuando se hace clic en el chip',
    },
    onRemove: {
      description: 'Callback cuando se hace clic en el botón de eliminar',
    },
  },
} satisfies Meta<typeof ConvenioChip>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Chip básico sin ámbito especificado
 */
export const Default: Story = {
  args: {
    nombre: 'Convenio General',
  },
};

/**
 * Chip con ámbito estatal - usa colores teal del sistema de diseño
 */
export const Estatal: Story = {
  args: {
    nombre: 'Convenio Estatal de Hostelería',
    ambito: 'estatal',
  },
};

/**
 * Chip con ámbito provincial - usa colores green del sistema de diseño
 */
export const Provincial: Story = {
  args: {
    nombre: 'Convenio Provincial de Construcción Madrid',
    ambito: 'provincial',
  },
};

/**
 * Chip con ámbito empresa - usa colores cyan del sistema de diseño
 */
export const Empresa: Story = {
  args: {
    nombre: 'Convenio de Empresa TechCorp SL',
    ambito: 'empresa',
  },
};

/**
 * Chip con botón de eliminar
 */
export const Removable: Story = {
  args: {
    nombre: 'Convenio Provincial de Transporte',
    ambito: 'provincial',
    removable: true,
    onRemove: fn(),
  },
};

/**
 * Chip en estado seleccionado con ring de resaltado
 */
export const Selected: Story = {
  args: {
    nombre: 'Convenio Estatal de Comercio',
    ambito: 'estatal',
    selected: true,
    onClick: fn(),
  },
};

/**
 * Muestra todos los ámbitos disponibles
 */
export const AllAmbitos: Story = {
  args: {
    nombre: 'Convenio General',
  },
  render: () => (
    <div className="flex flex-wrap gap-3">
      <ConvenioChip nombre="Convenio Estatal" ambito="estatal" />
      <ConvenioChip nombre="Convenio Provincial" ambito="provincial" />
      <ConvenioChip nombre="Convenio de Empresa" ambito="empresa" />
    </div>
  ),
};

/**
 * Lista interactiva con diferentes estados
 */
export const InteractiveList: Story = {
  args: {
    nombre: 'Convenio General',
  },
  render: () => (
    <div className="flex flex-wrap gap-3 max-w-2xl">
      <ConvenioChip
        nombre="Convenio Metal Estatal"
        ambito="estatal"
        selected
        onClick={fn()}
      />
      <ConvenioChip
        nombre="Construcción Madrid"
        ambito="provincial"
        removable
        onRemove={fn()}
      />
      <ConvenioChip
        nombre="Empresa TechCorp"
        ambito="empresa"
        onClick={fn()}
      />
      <ConvenioChip
        nombre="Hostelería Nacional"
        ambito="estatal"
        removable
        onRemove={fn()}
      />
      <ConvenioChip
        nombre="Comercio Barcelona"
        ambito="provincial"
        selected
        removable
        onClick={fn()}
        onRemove={fn()}
      />
    </div>
  ),
};

/**
 * Chip con nombre largo que se trunca automáticamente
 */
export const LongName: Story = {
  args: {
    nombre:
      'Convenio Colectivo Estatal de la Industria del Metal y Fabricación de Productos Metálicos de España 2024-2028',
    ambito: 'estatal',
    removable: true,
    onRemove: fn(),
  },
};
