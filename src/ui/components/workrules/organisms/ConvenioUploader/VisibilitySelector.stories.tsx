import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { VisibilitySelector } from './VisibilitySelector';

const meta = {
  title: 'WorkRules/Organisms/ConvenioUploader/VisibilitySelector',
  component: VisibilitySelector,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: 'radio',
      options: ['privado', 'publico'],
      description: 'Selected visibility option',
    },
    onChange: {
      action: 'changed',
      description: 'Callback when visibility changes',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the selector',
    },
  },
  args: {
    onChange: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ width: '320px', padding: '20px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof VisibilitySelector>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default story - Privado selected
export const PrivadoSelected: Story = {
  args: {
    value: 'privado',
    disabled: false,
  },
};

// Publico selected
export const PublicoSelected: Story = {
  args: {
    value: 'publico',
    disabled: false,
  },
};

// Disabled with Privado
export const DisabledPrivado: Story = {
  args: {
    value: 'privado',
    disabled: true,
  },
};

// Disabled with Publico
export const DisabledPublico: Story = {
  args: {
    value: 'publico',
    disabled: true,
  },
};
