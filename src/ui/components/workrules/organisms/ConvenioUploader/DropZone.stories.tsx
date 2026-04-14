import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { DropZone } from './DropZone';

const meta = {
  title: 'WorkRules/Organisms/ConvenioUploader/DropZone',
  component: DropZone,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: 'boolean',
      description: 'Deshabilita la zona de arrastre',
    },
    maxSizeMB: {
      control: 'number',
      description: 'Tamaño máximo del archivo en MB',
    },
  },
  args: {
    onFileSelect: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ width: '400px', padding: '20px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DropZone>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    disabled: false,
    maxSizeMB: 10,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    maxSizeMB: 10,
  },
};

export const SmallLimit: Story = {
  args: {
    disabled: false,
    maxSizeMB: 5,
  },
};

export const LargeLimit: Story = {
  args: {
    disabled: false,
    maxSizeMB: 50,
  },
};
