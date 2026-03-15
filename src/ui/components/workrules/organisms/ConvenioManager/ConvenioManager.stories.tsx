import type { UserConvenio } from '@core/types';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ConvenioManager } from './ConvenioManager';

const mockConvenios: UserConvenio[] = [
  {
    id: '1',
    nombre: 'Hosteleria Madrid - Personalizado',
    sector: 'Hosteleria',
    ambito: 'provincial',
    vigente: true,
    userId: 'user-1',
    isPrivate: true,
    status: 'ready',
    isFavorite: true,
    uploadedAt: '2026-03-10T10:00:00Z',
  },
  {
    id: '2',
    nombre: 'Convenio Empresa ABC',
    sector: 'Comercio',
    ambito: 'empresa',
    vigente: true,
    userId: 'user-1',
    isPrivate: true,
    status: 'processing',
    uploadedAt: '2026-03-14T09:30:00Z',
  },
  {
    id: '3',
    nombre: 'Metalurgia Provincial',
    sector: 'Industria',
    ambito: 'provincial',
    vigente: true,
    userId: 'user-1',
    isPrivate: false,
    status: 'pending',
    uploadedAt: '2026-03-14T11:00:00Z',
  },
  {
    id: '4',
    nombre: 'Convenio con Error',
    sector: 'Servicios',
    ambito: 'estatal',
    vigente: true,
    userId: 'user-1',
    isPrivate: true,
    status: 'error',
    errorMessage: 'No se pudo extraer las tablas salariales del PDF',
    uploadedAt: '2026-03-13T15:00:00Z',
  },
];

const meta: Meta<typeof ConvenioManager> = {
  title: 'WorkRules/Organisms/ConvenioManager',
  component: ConvenioManager,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Gestor de convenios Premium del usuario. Permite subir, editar, marcar favoritos y eliminar convenios subidos en PDF.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="p-2">
        <Story />
      </div>
    ),
  ],
  args: {
    onUpload: fn(),
    onEdit: fn(),
    onDelete: fn(),
    onToggleFavorite: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ConvenioManager>;

/**
 * Estado por defecto con una mezcla de convenios en diferentes estados:
 * ready, processing, pending y error.
 */
export const Default: Story = {
  args: {
    userConvenios: mockConvenios,
    isLoading: false,
  },
};

/**
 * Estado vacío cuando el usuario no ha subido ningún convenio todavía.
 */
export const Empty: Story = {
  args: {
    userConvenios: [],
    isLoading: false,
  },
};

/**
 * Estado de carga mostrando skeletons mientras se obtienen los convenios.
 */
export const Loading: Story = {
  args: {
    userConvenios: [],
    isLoading: true,
  },
};

/**
 * Todos los convenios en estado "ready" y disponibles para consulta.
 */
export const AllReady: Story = {
  args: {
    userConvenios: [
      {
        id: '1',
        nombre: 'Hosteleria Madrid - Personalizado',
        sector: 'Hosteleria',
        ambito: 'provincial',
        vigente: true,
        userId: 'user-1',
        isPrivate: true,
        status: 'ready',
        isFavorite: true,
        uploadedAt: '2026-03-10T10:00:00Z',
      },
      {
        id: '2',
        nombre: 'Comercio Barcelona',
        sector: 'Comercio',
        ambito: 'provincial',
        vigente: true,
        userId: 'user-1',
        isPrivate: true,
        status: 'ready',
        isFavorite: false,
        uploadedAt: '2026-03-12T14:20:00Z',
      },
      {
        id: '3',
        nombre: 'Construcción Nacional',
        sector: 'Construcción',
        ambito: 'estatal',
        vigente: true,
        userId: 'user-1',
        isPrivate: false,
        status: 'ready',
        isFavorite: true,
        uploadedAt: '2026-03-13T08:15:00Z',
      },
    ],
    isLoading: false,
  },
};
