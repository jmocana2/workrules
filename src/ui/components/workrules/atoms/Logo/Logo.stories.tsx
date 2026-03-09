import type { Meta, StoryObj } from '@storybook/react-vite';
import { Logo } from './Logo';

const meta: Meta<typeof Logo> = {
  title: 'workrules/atoms/Logo',
  component: Logo,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['full', 'icon', 'text'],
      description: 'Variante visual del logo',
      table: {
        defaultValue: { summary: 'full' },
        type: { summary: 'full | icon | text' },
      },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Tamaño del logo',
      table: {
        defaultValue: { summary: 'md' },
        type: { summary: 'sm | md | lg' },
      },
    },
    theme: {
      control: 'select',
      options: ['light', 'dark', 'auto'],
      description: 'Tema de color del logo',
      table: {
        defaultValue: { summary: 'auto' },
        type: { summary: 'light | dark | auto' },
      },
    },
    className: {
      control: 'text',
      description: 'Clases CSS adicionales',
      table: {
        type: { summary: 'string' },
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Logo>;

/**
 * Logo por defecto con todas las propiedades en sus valores predeterminados
 */
export const Default: Story = {
  args: {},
};

/**
 * Logo completo que muestra el icono y el texto juntos
 */
export const FullLogo: Story = {
  args: {
    variant: 'full',
    size: 'md',
  },
};

/**
 * Solo el icono del logo sin texto
 */
export const IconOnly: Story = {
  args: {
    variant: 'icon',
    size: 'md',
  },
};

/**
 * Solo el texto del logo sin icono
 */
export const TextOnly: Story = {
  args: {
    variant: 'text',
    size: 'md',
  },
};

/**
 * Muestra todos los tamaños disponibles del logo
 */
export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-6 items-center">
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-2">Pequeño (sm)</p>
        <Logo size="sm" />
      </div>
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-2">Mediano (md)</p>
        <Logo size="md" />
      </div>
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-2">Grande (lg)</p>
        <Logo size="lg" />
      </div>
    </div>
  ),
};

/**
 * Muestra todas las variantes disponibles del logo
 */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-6 items-center">
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-2">Completo (full)</p>
        <Logo variant="full" size="md" />
      </div>
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-2">Solo icono (icon)</p>
        <Logo variant="icon" size="md" />
      </div>
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-2">Solo texto (text)</p>
        <Logo variant="text" size="md" />
      </div>
    </div>
  ),
};

/**
 * Logo con tema oscuro
 */
export const DarkTheme: Story = {
  args: {
    theme: 'dark',
  },
  parameters: {
    backgrounds: {
      default: 'dark',
    },
  },
  decorators: [
    (Story) => (
      <div className="bg-gray-900 p-8 rounded-lg">
        <Story />
      </div>
    ),
  ],
};

/**
 * Logo con tema claro
 */
export const LightTheme: Story = {
  args: {
    theme: 'light',
  },
  parameters: {
    backgrounds: {
      default: 'light',
    },
  },
  decorators: [
    (Story) => (
      <div className="bg-white p-8 rounded-lg">
        <Story />
      </div>
    ),
  ],
};

/**
 * Logo con clase personalizada para demostrar extensibilidad
 */
export const CustomClassName: Story = {
  args: {
    className: 'opacity-75 hover:opacity-100 transition-opacity cursor-pointer',
  },
};

/**
 * Combinación de todas las variantes y tamaños en una cuadrícula
 */
export const AllCombinations: Story = {
  render: () => (
    <div className="space-y-8">
      <div className="grid grid-cols-3 gap-6 items-center">
        <div className="text-xs text-gray-500 font-semibold">Full</div>
        <div className="text-xs text-gray-500 font-semibold">Icon</div>
        <div className="text-xs text-gray-500 font-semibold">Text</div>

        <div className="flex flex-col gap-4 items-center">
          <p className="text-xs text-gray-600">sm</p>
          <Logo variant="full" size="sm" />
        </div>
        <div className="flex flex-col gap-4 items-center">
          <p className="text-xs text-gray-600">sm</p>
          <Logo variant="icon" size="sm" />
        </div>
        <div className="flex flex-col gap-4 items-center">
          <p className="text-xs text-gray-600">sm</p>
          <Logo variant="text" size="sm" />
        </div>

        <div className="flex flex-col gap-4 items-center">
          <p className="text-xs text-gray-600">md</p>
          <Logo variant="full" size="md" />
        </div>
        <div className="flex flex-col gap-4 items-center">
          <p className="text-xs text-gray-600">md</p>
          <Logo variant="icon" size="md" />
        </div>
        <div className="flex flex-col gap-4 items-center">
          <p className="text-xs text-gray-600">md</p>
          <Logo variant="text" size="md" />
        </div>

        <div className="flex flex-col gap-4 items-center">
          <p className="text-xs text-gray-600">lg</p>
          <Logo variant="full" size="lg" />
        </div>
        <div className="flex flex-col gap-4 items-center">
          <p className="text-xs text-gray-600">lg</p>
          <Logo variant="icon" size="lg" />
        </div>
        <div className="flex flex-col gap-4 items-center">
          <p className="text-xs text-gray-600">lg</p>
          <Logo variant="text" size="lg" />
        </div>
      </div>
    </div>
  ),
};
