import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { AlertSMI } from './AlertSMI';

const meta: Meta<typeof AlertSMI> = {
  title: 'workrules/molecules/AlertSMI',
  component: AlertSMI,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
## AlertSMI

Alerta que se muestra cuando el calculo salarial resulta inferior al Salario Minimo Interprofesional (SMI).

### Estado del Protocolo

Corresponde al **Estado E** del protocolo de interaccion definido en el brief.

### Contexto legal

El Art. 27 del Estatuto de los Trabajadores establece que ningun trabajador puede percibir
un salario inferior al SMI, independientemente de lo que establezca su convenio colectivo.

### SMI 2026

- 14 pagas: 1.221 EUR/mes
- 12 pagas: 1.424 EUR/mes (prorrateo)
- Anual: 17.094 EUR

### Uso

\`\`\`tsx
<AlertSMI
  calculatedAmount={950.00}
  smiAmount={1221.00}
  adjustedAmount={1221.00}
  payPeriod="14-pagas"
  onViewDetails={() => console.log('Ver desglose')}
/>
\`\`\`
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    calculatedAmount: {
      control: { type: 'number', min: 0, step: 50 },
      description: 'Monto calculado segun convenio (EUR/mes)',
    },
    smiAmount: {
      control: { type: 'number', min: 0, step: 50 },
      description: 'SMI vigente (EUR/mes)',
    },
    adjustedAmount: {
      control: { type: 'number', min: 0, step: 50 },
      description: 'Monto ajustado a aplicar (EUR/mes)',
    },
    payPeriod: {
      control: 'select',
      options: ['14-pagas', '12-pagas'],
      description: 'Tipo de distribucion de pagas',
    },
  },
  args: {
    onViewDetails: fn(),
    onDismiss: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof AlertSMI>;

export const Default: Story = {
  args: {
    calculatedAmount: 950.00,
    smiAmount: 1221.00,
    adjustedAmount: 1221.00,
    payPeriod: '14-pagas',
  },
};

export const With12Pagas: Story = {
  args: {
    calculatedAmount: 1100.00,
    smiAmount: 1424.00,
    adjustedAmount: 1424.00,
    payPeriod: '12-pagas',
  },
};

export const SlightlyBelowSMI: Story = {
  args: {
    calculatedAmount: 1180.00,
    smiAmount: 1221.00,
    adjustedAmount: 1221.00,
    payPeriod: '14-pagas',
  },
};

export const WithoutActions: Story = {
  args: {
    calculatedAmount: 950.00,
    smiAmount: 1221.00,
    adjustedAmount: 1221.00,
    payPeriod: '14-pagas',
    onViewDetails: undefined,
    onDismiss: undefined,
  },
};

export const InChatContext: Story = {
  render: (args) => (
    <div className="max-w-2xl space-y-4 p-4 bg-muted/30 rounded-lg">
      <div className="bg-background p-4 rounded-lg border">
        <p className="text-sm text-foreground mb-2">Usuario</p>
        <p>Calcula el salario de un ayudante de cocina en hotel 3 estrellas</p>
      </div>
      <div className="bg-background p-4 rounded-lg border">
        <p className="text-sm text-foreground mb-2">WorkRules</p>
        <p className="mb-4">
          He calculado el salario segun el convenio de hosteleria:
        </p>
        <AlertSMI {...args} />
      </div>
    </div>
  ),
  args: {
    calculatedAmount: 950.00,
    smiAmount: 1221.00,
    adjustedAmount: 1221.00,
    payPeriod: '14-pagas',
  },
};

export const Dismissible: Story = {
  args: {
    calculatedAmount: 950.00,
    smiAmount: 1221.00,
    adjustedAmount: 1221.00,
    payPeriod: '14-pagas',
    onDismiss: fn(),
  },
};