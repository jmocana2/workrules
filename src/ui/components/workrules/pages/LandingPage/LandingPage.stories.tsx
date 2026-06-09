import type { Meta, StoryObj } from "@storybook/react-vite";
import { LandingPage } from "./LandingPage";

const meta: Meta<typeof LandingPage> = {
  title: "WorkRules/Pages/LandingPage",
  component: LandingPage,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Página de entrada con login para usuarios no autenticados. " +
          "Incluye el slogan animado (typewriter) y el formulario de inicio de sesión. " +
          "En Storybook el submit del formulario no llega a Supabase real (mock).",
      },
    },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof LandingPage>;

/** Estado por defecto: formulario limpio, esperando credenciales. */
export const Default: Story = {};
