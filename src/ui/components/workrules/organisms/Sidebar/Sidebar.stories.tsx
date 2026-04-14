import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Sidebar } from './Sidebar';
import type { ConversationSummary } from '@core/types';

const mockConversations: ConversationSummary[] = [
  {
    id: '1',
    title: 'Consulta sobre vacaciones',
    convenioId: 'conv-1',
    convenioNombre: 'Convenio Comercio',
    lastMessageAt: '2024-01-15T10:30:00Z',
    preview: '¿Cuántos días de vacaciones me corresponden después de 2 años?',
  },
  {
    id: '2',
    title: 'Cálculo salario diciembre',
    convenioId: 'conv-2',
    convenioNombre: 'Convenio Hostelería',
    lastMessageAt: '2024-01-14T16:45:00Z',
    preview: 'Necesito calcular mi salario con las pagas extras prorrateadas',
  },
  {
    id: '3',
    title: 'Período de prueba',
    convenioId: 'conv-1',
    convenioNombre: 'Convenio Comercio',
    lastMessageAt: '2024-01-13T09:15:00Z',
    preview: '¿Cuál es la duración del período de prueba en mi categoría?',
  },
  {
    id: '4',
    title: 'Antigüedad',
    convenioId: 'conv-3',
    convenioNombre: 'Convenio Construcción',
    lastMessageAt: '2024-01-12T14:20:00Z',
    preview: 'Información sobre complementos por antigüedad',
  },
  {
    id: '5',
    title: 'Jornada laboral',
    convenioId: 'conv-1',
    convenioNombre: 'Convenio Comercio',
    lastMessageAt: '2024-01-11T11:00:00Z',
    preview: '¿Cuántas horas semanales establece el convenio?',
  },
];

const meta = {
  title: 'WorkRules/Organisms/Sidebar',
  component: Sidebar,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Panel lateral de navegación que muestra el logo, botón de nueva consulta, lista de conversaciones previas y footer con badge de plan y configuración.',
      },
    },
  },
  argTypes: {
    currentConversationId: {
      control: 'text',
      description: 'ID de la conversación actualmente seleccionada',
    },
    conversations: {
      control: 'object',
      description: 'Array de conversaciones para mostrar en la lista',
    },
    userPlan: {
      control: 'radio',
      options: ['free', 'premium'],
      description: 'Plan del usuario (free o premium)',
    },
    onNewConversation: {
      description: 'Callback ejecutado al hacer clic en "Nueva consulta"',
    },
    onSelectConversation: {
      description: 'Callback ejecutado al seleccionar una conversación',
    },
    onOpenSettings: {
      description: 'Callback ejecutado al hacer clic en el botón de configuración',
    },
    onConvenioUploaded: {
      description: 'Callback ejecutado cuando se completa la subida de un convenio (solo premium)',
    },
    className: {
      control: 'text',
      description: 'Clases CSS adicionales',
    },
  },
  args: {
    onNewConversation: fn(),
    onSelectConversation: fn(),
    onOpenSettings: fn(),
    onConvenioUploaded: fn(),
  },
  decorators: [
    (Story: () => React.JSX.Element) => (
      <div style={{ height: '100vh', display: 'flex' }}>
        <Story />
        <div style={{ flex: 1, backgroundColor: 'var(--colorsNeutralNeutral1)', padding: '2rem' }}>
          <p style={{ color: 'var(--colorsNeutralNeutral12)' }}>
            Contenido principal de la aplicación
          </p>
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Sidebar con conversaciones y plan Free
 */
export const Default: Story = {
  args: {
    conversations: mockConversations,
    currentConversationId: '2',
    userPlan: 'free',
  },
};

/**
 * Sidebar sin conversaciones (estado vacío)
 */
export const Empty: Story = {
  args: {
    conversations: [],
    userPlan: 'free',
  },
};

/**
 * Sidebar con plan Premium
 *
 * Incluye el ConvenioUploader que permite a usuarios premium subir sus propios convenios colectivos.
 * El uploader solo se muestra para usuarios con plan premium.
 */
export const Premium: Story = {
  args: {
    conversations: mockConversations,
    currentConversationId: '1',
    userPlan: 'premium',
  },
};

/**
 * Sidebar con pocas conversaciones
 */
export const FewConversations: Story = {
  args: {
    conversations: mockConversations.slice(0, 2),
    currentConversationId: '1',
    userPlan: 'free',
  },
};

/**
 * Sidebar con muchas conversaciones (scroll)
 */
export const ManyConversations: Story = {
  args: {
    conversations: [
      ...mockConversations,
      ...Array.from({ length: 15 }, (_, i) => ({
        id: `conv-${i + 6}`,
        title: `Consulta adicional ${i + 1}`,
        convenioId: `conv-${(i % 3) + 1}`,
        convenioNombre: ['Convenio Comercio', 'Convenio Hostelería', 'Convenio Construcción'][
          i % 3
        ],
        lastMessageAt: new Date(2024, 0, 10 - i).toISOString(),
        preview: `Preview de la consulta número ${i + 6} con contenido de ejemplo`,
      })),
    ],
    currentConversationId: '3',
    userPlan: 'premium',
  },
};

/**
 * Sidebar sin conversación activa
 */
export const NoActiveConversation: Story = {
  args: {
    conversations: mockConversations,
    currentConversationId: undefined,
    userPlan: 'free',
  },
};
