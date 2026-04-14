import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ConvenioPreview } from './ConvenioPreview';

/**
 * ConvenioPreview muestra un resumen de la metadata extraída de un convenio colectivo
 * antes de confirmar la subida.
 *
 * - Muestra datos básicos: nombre (obligatorio), ámbito, páginas, vigencia (opcionales)
 * - Permite confirmar o cancelar la operación
 * - Estado de carga que deshabilita botones durante el procesamiento
 * - Utiliza variables semánticas del sistema de diseño para adaptarse al tema activo
 */
const meta = {
  title: 'WorkRules/Organisms/ConvenioUploader/ConvenioPreview',
  component: ConvenioPreview,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Componente que muestra una vista previa de los datos extraídos de un convenio colectivo PDF antes de confirmar su carga al sistema. Muestra información básica y permite validar antes de procesar.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    data: {
      description: 'Datos del convenio a mostrar',
    },
    onConfirm: {
      description: 'Callback cuando se confirma la subida',
    },
    onCancel: {
      description: 'Callback cuando se cancela la operación',
    },
    isLoading: {
      control: 'boolean',
      description: 'Estado de carga que deshabilita los botones',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '400px', padding: '20px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ConvenioPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Vista previa con todos los datos disponibles
 */
export const Default: Story = {
  args: {
    data: {
      nombre: 'Convenio Colectivo de Hostelería de Madrid',
      ambito: 'provincial',
      paginas: 127,
      vigencia: '2023-2026',
    },
    isLoading: false,
    onConfirm: fn(),
    onCancel: fn(),
  },
};

/**
 * Vista previa con datos mínimos (solo nombre obligatorio)
 */
export const MinimalData: Story = {
  args: {
    data: {
      nombre: 'Convenio Colectivo de Transporte',
    },
    isLoading: false,
    onConfirm: fn(),
    onCancel: fn(),
  },
};

/**
 * Vista previa con datos parciales
 */
export const PartialData: Story = {
  args: {
    data: {
      nombre: 'Convenio Colectivo de Construcción',
      ambito: 'nacional',
      paginas: 85,
    },
    isLoading: false,
    onConfirm: fn(),
    onCancel: fn(),
  },
};

/**
 * Estado de carga/procesamiento
 * Los botones están deshabilitados y el botón Confirmar muestra "Procesando..."
 */
export const Loading: Story = {
  args: {
    data: {
      nombre: 'Convenio Colectivo de Comercio',
      ambito: 'autonómico',
      paginas: 64,
      vigencia: '2024-2027',
    },
    isLoading: true,
    onConfirm: fn(),
    onCancel: fn(),
  },
};

/**
 * Nombre largo que puede ocupar varias líneas
 */
export const LongName: Story = {
  args: {
    data: {
      nombre: 'Convenio Colectivo Estatal de Empresas de Consultoría y Estudios de Mercado y de la Opinión Pública',
      ambito: 'estatal',
      paginas: 156,
      vigencia: '2022-2025',
    },
    isLoading: false,
    onConfirm: fn(),
    onCancel: fn(),
  },
};

/**
 * Diferentes ámbitos de aplicación
 */
export const DifferentScopes: Story = {
  args: {
    data: {
      nombre: 'Convenio de Ámbito Nacional',
      ambito: 'nacional',
      paginas: 45,
    },
    onConfirm: fn(),
    onCancel: fn(),
  },
  render: () => (
    <div className="flex flex-col gap-4" style={{ width: '400px' }}>
      <ConvenioPreview
        data={{
          nombre: 'Convenio de Ámbito Nacional',
          ambito: 'nacional',
          paginas: 45,
        }}
        onConfirm={fn()}
        onCancel={fn()}
      />
      <ConvenioPreview
        data={{
          nombre: 'Convenio de Ámbito Provincial',
          ambito: 'provincial',
          paginas: 78,
        }}
        onConfirm={fn()}
        onCancel={fn()}
      />
      <ConvenioPreview
        data={{
          nombre: 'Convenio de Ámbito Autonómico',
          ambito: 'autonómico',
          paginas: 93,
        }}
        onConfirm={fn()}
        onCancel={fn()}
      />
    </div>
  ),
};
