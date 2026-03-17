import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChatPage } from './ChatPage';
import { MOCK_CONVENIOS, MOCK_PERFIL_HOSTELERIA, MOCK_CONVERSATIONS } from '@mocks/data/convenios';

const meta: Meta<typeof ChatPage> = {
  title: 'WorkRules/Pages/ChatPage',
  component: ChatPage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Página principal de chat para consultas de convenios colectivos. ' +
          'Incluye Sidebar (izquierda), área de chat (centro) y VariablesPanel (derecha).',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    mockConvenios: MOCK_CONVENIOS,
    mockConversations: MOCK_CONVERSATIONS,
    mockUserPlan: 'free',
  },
};

export default meta;
type Story = StoryObj<typeof ChatPage>;

/**
 * Estado por defecto - usuario sin convenio seleccionado.
 * Muestra el estado vacío con instrucciones para seleccionar un convenio.
 */
export const Default: Story = {
  args: {},
};

/**
 * Con convenio seleccionado y perfil JSON cargado.
 * El VariablesPanel muestra las variables del convenio.
 */
export const WithConvenioSelected: Story = {
  args: {
    mockPerfil: MOCK_PERFIL_HOSTELERIA,
  },
};

/**
 * Usuario Premium - muestra badge de Premium en el Sidebar.
 */
export const PremiumUser: Story = {
  args: {
    mockUserPlan: 'premium',
    mockPerfil: MOCK_PERFIL_HOSTELERIA,
  },
};

/**
 * Sin conversaciones previas - estado inicial del usuario.
 */
export const NoConversations: Story = {
  args: {
    mockConversations: [],
  },
};

/**
 * Sin convenios disponibles - edge case.
 */
export const NoConvenios: Story = {
  args: {
    mockConvenios: [],
    mockConversations: [],
  },
};
