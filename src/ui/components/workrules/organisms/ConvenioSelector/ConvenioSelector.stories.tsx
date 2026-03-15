import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { ConvenioSelector } from './ConvenioSelector';
import type { Convenio } from '@core/types';

const meta = {
  title: 'WorkRules/Organisms/ConvenioSelector',
  component: ConvenioSelector,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Combobox con búsqueda fuzzy para seleccionar convenios colectivos. Incluye filtrado inteligente que normaliza acentos y permite matches no consecutivos.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    selectedConvenio: {
      description: 'Convenio actualmente seleccionado',
      control: false,
    },
    convenios: {
      description: 'Lista de convenios disponibles',
      control: false,
    },
    isLoading: {
      description: 'Muestra skeleton durante carga',
      control: 'boolean',
    },
    onSelect: {
      description: 'Callback cuando se selecciona un convenio',
      action: 'selected',
    },
    onClear: {
      description: 'Callback cuando se limpia la selección',
      action: 'cleared',
    },
    placeholder: {
      description: 'Texto placeholder cuando no hay selección',
      control: 'text',
    },
  },
} satisfies Meta<typeof ConvenioSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock data
const mockConvenios: Convenio[] = [
  {
    id: '1',
    nombre: 'Convenio Estatal de Comercio',
    ambito: 'estatal',
    codigo_boe: 'BOE-A-2023-12345',
    url_boe: 'https://boe.es/diario_boe/txt.php?id=BOE-A-2023-12345',
    created_at: '2023-01-15T10:00:00Z',
    updated_at: '2023-01-15T10:00:00Z',
  },
  {
    id: '2',
    nombre: 'Convenio Estatal de Hostelería',
    ambito: 'estatal',
    codigo_boe: 'BOE-A-2023-23456',
    url_boe: 'https://boe.es/diario_boe/txt.php?id=BOE-A-2023-23456',
    created_at: '2023-02-20T10:00:00Z',
    updated_at: '2023-02-20T10:00:00Z',
  },
  {
    id: '3',
    nombre: 'Convenio Provincial de Construcción (Madrid)',
    ambito: 'provincial',
    codigo_boe: 'BOE-A-2023-34567',
    url_boe: 'https://boe.es/diario_boe/txt.php?id=BOE-A-2023-34567',
    created_at: '2023-03-10T10:00:00Z',
    updated_at: '2023-03-10T10:00:00Z',
  },
  {
    id: '4',
    nombre: 'Convenio Provincial de Educación (Barcelona)',
    ambito: 'provincial',
    codigo_boe: 'BOE-A-2023-45678',
    url_boe: 'https://boe.es/diario_boe/txt.php?id=BOE-A-2023-45678',
    created_at: '2023-04-05T10:00:00Z',
    updated_at: '2023-04-05T10:00:00Z',
  },
  {
    id: '5',
    nombre: 'Convenio de Empresa - Telefónica España',
    ambito: 'empresa',
    codigo_boe: 'BOE-A-2023-56789',
    url_boe: 'https://boe.es/diario_boe/txt.php?id=BOE-A-2023-56789',
    created_at: '2023-05-12T10:00:00Z',
    updated_at: '2023-05-12T10:00:00Z',
  },
  {
    id: '6',
    nombre: 'Convenio de Empresa - Mercadona S.A.',
    ambito: 'empresa',
    codigo_boe: 'BOE-A-2023-67890',
    url_boe: 'https://boe.es/diario_boe/txt.php?id=BOE-A-2023-67890',
    created_at: '2023-06-18T10:00:00Z',
    updated_at: '2023-06-18T10:00:00Z',
  },
  {
    id: '7',
    nombre: 'Convenio Estatal de Oficinas y Despachos',
    ambito: 'estatal',
    codigo_boe: 'BOE-A-2023-78901',
    url_boe: 'https://boe.es/diario_boe/txt.php?id=BOE-A-2023-78901',
    created_at: '2023-07-22T10:00:00Z',
    updated_at: '2023-07-22T10:00:00Z',
  },
  {
    id: '8',
    nombre: 'Convenio Provincial de Sanidad Privada (Valencia)',
    ambito: 'provincial',
    codigo_boe: 'BOE-A-2023-89012',
    url_boe: 'https://boe.es/diario_boe/txt.php?id=BOE-A-2023-89012',
    created_at: '2023-08-30T10:00:00Z',
    updated_at: '2023-08-30T10:00:00Z',
  },
];

/**
 * Estado por defecto sin selección
 */
export const Default: Story = {
  args: {
    convenios: mockConvenios,
    isLoading: false,
    placeholder: 'Seleccionar convenio colectivo...',
    onSelect: fn(),
    onClear: fn(),
  },
  render: (args) => (
    <div className="w-[500px]">
      <ConvenioSelector {...args} />
    </div>
  ),
};

/**
 * Con convenio seleccionado
 * Muestra el chip removible debajo del selector
 */
export const WithSelection: Story = {
  args: {
    selectedConvenio: mockConvenios[0],
    convenios: mockConvenios,
    isLoading: false,
    onSelect: fn(),
    onClear: fn(),
  },
  render: (args) => (
    <div className="w-[500px]">
      <ConvenioSelector {...args} />
    </div>
  ),
};

/**
 * Estado de carga
 * Muestra skeleton mientras se cargan los convenios
 */
export const Loading: Story = {
  args: {
    convenios: [],
    isLoading: true,
    onSelect: fn(),
    onClear: fn(),
  },
  render: (args) => (
    <div className="w-[500px]">
      <ConvenioSelector {...args} />
    </div>
  ),
};

/**
 * Versión interactiva con estado
 * Permite probar la funcionalidad completa del componente
 */
export const Interactive: Story = {
  render: (args) => {
    const [selectedConvenio, setSelectedConvenio] = useState<Convenio | null>(
      null
    );

    return (
      <div className="w-[500px] space-y-4">
        <ConvenioSelector
          {...args}
          selectedConvenio={selectedConvenio}
          onSelect={setSelectedConvenio}
          onClear={() => setSelectedConvenio(null)}
        />

        {selectedConvenio && (
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <h4 className="mb-2 text-sm font-semibold">
              Convenio seleccionado:
            </h4>
            <dl className="space-y-1 text-xs">
              <div className="flex gap-2">
                <dt className="font-medium text-muted-foreground">ID:</dt>
                <dd className="font-mono">{selectedConvenio.id}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-medium text-muted-foreground">Nombre:</dt>
                <dd>{selectedConvenio.nombre}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-medium text-muted-foreground">Ámbito:</dt>
                <dd className="capitalize">{selectedConvenio.ambito}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-medium text-muted-foreground">BOE:</dt>
                <dd className="font-mono">{selectedConvenio.codigo_boe}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    );
  },
  args: {
    convenios: mockConvenios,
    isLoading: false,
    placeholder: 'Buscar convenio colectivo...',
    onSelect: fn(),
    onClear: fn(),
  },
};

/**
 * Lista vacía
 * Muestra el estado cuando no hay convenios disponibles
 */
export const EmptyList: Story = {
  args: {
    convenios: [],
    isLoading: false,
    placeholder: 'No hay convenios disponibles',
    onSelect: fn(),
    onClear: fn(),
  },
  render: (args) => (
    <div className="w-[500px]">
      <ConvenioSelector {...args} />
    </div>
  ),
};
