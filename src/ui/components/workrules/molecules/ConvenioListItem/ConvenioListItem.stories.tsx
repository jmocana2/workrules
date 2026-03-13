import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ConvenioListItem } from './ConvenioListItem';

const meta: Meta<typeof ConvenioListItem> = {
  title: 'workrules/molecules/ConvenioListItem',
  component: ConvenioListItem,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
## ConvenioListItem

Item que representa un convenio colectivo en una lista.

### Usos

- Selector de convenios
- Historial de consultas
- Resultados de busqueda
- Lista de convenios disponibles

### Uso

\`\`\`tsx
<ConvenioListItem
  id="conv-001"
  nombre="Hosteleria de Madrid"
  ambito="provincial"
  sector="Hosteleria"
  fechaActualizacion="2024-01-15"
  onClick={() => selectConvenio('conv-001')}
/>
\`\`\`
        `,
      },
    },
  },
  tags: ['autodocs'],
  args: {
    onClick: fn(),
    onInfo: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ConvenioListItem>;

export const Default: Story = {
  args: {
    id: 'conv-001',
    nombre: 'Hosteleria de Madrid',
    ambito: 'provincial',
    sector: 'Hosteleria',
    fechaActualizacion: '2024-01-15',
  },
};

export const Estatal: Story = {
  args: {
    id: 'conv-002',
    nombre: 'Construccion',
    ambito: 'estatal',
    sector: 'Construccion',
    fechaActualizacion: '2024-02-20',
  },
};

export const Empresa: Story = {
  args: {
    id: 'conv-003',
    nombre: 'Telefonica SAU',
    ambito: 'empresa',
    sector: 'Telecomunicaciones',
    fechaActualizacion: '2023-12-01',
  },
};

export const Selected: Story = {
  args: {
    id: 'conv-001',
    nombre: 'Hosteleria de Valencia',
    ambito: 'provincial',
    sector: 'Hosteleria',
    isSelected: true,
  },
};

export const WithoutDate: Story = {
  args: {
    id: 'conv-004',
    nombre: 'Metal de Barcelona',
    ambito: 'provincial',
    sector: 'Industria metalurgica',
  },
};

export const NonInteractive: Story = {
  args: {
    id: 'conv-005',
    nombre: 'Comercio de Sevilla',
    ambito: 'provincial',
    sector: 'Comercio',
    onClick: undefined,
    onInfo: undefined,
  },
};

export const ConvenioList: Story = {
  render: () => (
    <div className="max-w-md space-y-2">
      <ConvenioListItem
        id="1"
        nombre="Hosteleria de Madrid"
        ambito="provincial"
        sector="Hosteleria"
        fechaActualizacion="2024-01-15"
        onClick={() => {}}
        onInfo={() => {}}
      />
      <ConvenioListItem
        id="2"
        nombre="Construccion Estatal"
        ambito="estatal"
        sector="Construccion"
        fechaActualizacion="2024-02-20"
        isSelected
        onClick={() => {}}
        onInfo={() => {}}
      />
      <ConvenioListItem
        id="3"
        nombre="Comercio de Valencia"
        ambito="provincial"
        sector="Comercio"
        fechaActualizacion="2023-11-10"
        onClick={() => {}}
        onInfo={() => {}}
      />
      <ConvenioListItem
        id="4"
        nombre="Telefonica SAU"
        ambito="empresa"
        sector="Telecomunicaciones"
        onClick={() => {}}
        onInfo={() => {}}
      />
    </div>
  ),
};
