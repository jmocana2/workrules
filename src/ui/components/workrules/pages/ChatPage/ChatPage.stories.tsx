import {
  MOCK_CONVENIOS,
  MOCK_CONVERSATIONS,
  MOCK_PERFIL_HOSTELERIA,
} from "@mocks/data/convenios";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { UserConvenio } from "@core/types";
import { ChatPage } from "./ChatPage";

const meta: Meta<typeof ChatPage> = {
  title: "WorkRules/Pages/ChatPage",
  component: ChatPage,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Página principal de chat para consultas de convenios colectivos. " +
          "Sidebar (izquierda) + área de chat (centro) + VariablesPanel (derecha). " +
          "Todas las stories usan repositorios in-memory inyectados vía `withProviders`.",
      },
    },
    mockData: {
      convenios: MOCK_CONVENIOS,
      conversations: MOCK_CONVERSATIONS,
      userPlan: "free",
    },
  },
  tags: ["autodocs"],
  args: {
    mockConvenios: MOCK_CONVENIOS,
    mockConversations: MOCK_CONVERSATIONS,
    mockUserPlan: "free",
  },
};

export default meta;
type Story = StoryObj<typeof ChatPage>;

/** Estado por defecto: sin convenio seleccionado. */
export const Default: Story = {};

/** Convenio seleccionado y perfil JSON cargado en el VariablesPanel. */
export const WithConvenioSelected: Story = {
  args: {
    initialConvenioId: MOCK_CONVENIOS[0].id,
    mockPerfil: MOCK_PERFIL_HOSTELERIA,
  },
  parameters: {
    mockData: {
      convenios: MOCK_CONVENIOS,
      conversations: MOCK_CONVERSATIONS,
      perfil: MOCK_PERFIL_HOSTELERIA,
      userPlan: "free",
    },
  },
};

/** Usuario Premium: el sidebar muestra el badge de Premium. */
export const PremiumUser: Story = {
  args: {
    mockUserPlan: "premium",
    mockPerfil: MOCK_PERFIL_HOSTELERIA,
    initialConvenioId: MOCK_CONVENIOS[0].id,
  },
  parameters: {
    mockData: {
      convenios: MOCK_CONVENIOS,
      conversations: MOCK_CONVERSATIONS,
      perfil: MOCK_PERFIL_HOSTELERIA,
      userPlan: "premium",
    },
  },
};

/** Usuario con convenios privados subidos: el ConvenioManager los lista. */
export const WithUserConvenios: Story = {
  args: {
    mockUserPlan: "premium",
    mockConvenios: MOCK_CONVENIOS,
  },
  parameters: {
    mockData: {
      convenios: MOCK_CONVENIOS,
      conversations: MOCK_CONVERSATIONS,
      userPlan: "premium",
      userConvenios: [
        {
          ...MOCK_CONVENIOS[0],
          id: "user-conv-1",
          nombre: "Mi convenio interno",
          visibilidad: "privado",
          userId: "user-1",
          isPrivate: true,
          status: "ready",
          uploadedAt: new Date().toISOString(),
        },
        {
          ...MOCK_CONVENIOS[0],
          id: "user-conv-2",
          nombre: "Convenio en procesamiento",
          visibilidad: "privado",
          userId: "user-1",
          isPrivate: true,
          status: "processing",
          uploadedAt: new Date().toISOString(),
        },
      ] satisfies UserConvenio[],
    },
  },
};

/** Sin conversaciones previas: el sidebar aparece vacío. */
export const NoConversations: Story = {
  args: {
    mockConversations: [],
  },
  parameters: {
    mockData: {
      convenios: MOCK_CONVENIOS,
      conversations: [],
      userPlan: "free",
    },
  },
};

/** Sin convenios disponibles (edge case): el selector queda vacío. */
export const NoConvenios: Story = {
  args: {
    mockConvenios: [],
    mockConversations: [],
  },
  parameters: {
    mockData: {
      convenios: [],
      conversations: [],
      userPlan: "free",
    },
  },
};
