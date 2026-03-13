import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { AlertInvalidData } from './AlertInvalidData';

const meta: Meta<typeof AlertInvalidData> = {
  title: 'workrules/molecules/AlertInvalidData',
  component: AlertInvalidData,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
## AlertInvalidData

Alerta que se muestra cuando los datos proporcionados son invalidos o estan fuera de rango legal.

### Estado del Protocolo

Corresponde al **Estado D** del protocolo de interaccion.

### Ejemplos de validaciones

- Horas extra > 80 anuales (Art. 35.2 ET)
- Jornada > 40h semanales sin justificacion (Art. 34.1 ET)
- Periodo de prueba > maximo del convenio

### Uso

\`\`\`tsx
<AlertInvalidData
  reason={{
    field: 'horas extra',
    value: 120,
    limit: 'el maximo legal son 80 horas anuales',
    legalReference: 'Art. 35.2 ET'
  }}
  suggestions={[
    '40 horas extra este mes',
    '40 horas nocturnas (no extra)'
  ]}
  onSelectSuggestion={(s) => console.log('Seleccionado:', s)}
/>
\`\`\`
        `,
      },
    },
  },
  tags: ['autodocs'],
  args: {
    onSelectSuggestion: fn(),
    onDismiss: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof AlertInvalidData>;

export const Default: Story = {
  args: {
    reason: {
      field: 'horas extra',
      value: '40 horas en un dia',
      limit: 'el Estatuto de los Trabajadores establece un maximo de 80 horas extra anuales',
      legalReference: 'Art. 35.2 ET',
    },
    suggestions: [
      '40 horas extra este mes',
      '40 horas nocturnas (no extra)',
    ],
  },
};

export const ExcessiveWeeklyHours: Story = {
  args: {
    reason: {
      field: 'jornada semanal',
      value: '60 horas',
      limit: 'la jornada maxima ordinaria son 40 horas semanales',
      legalReference: 'Art. 34.1 ET',
    },
    suggestions: [
      'Jornada completa (40h/semana)',
      'Jornada parcial con horas extra',
    ],
  },
};

export const InvalidTrialPeriod: Story = {
  args: {
    reason: {
      field: 'periodo de prueba',
      value: '12 meses',
      limit: 'el convenio establece un maximo de 6 meses para este grupo profesional',
    },
    suggestions: [
      '6 meses (maximo segun convenio)',
      '3 meses (tecnico)',
      '2 meses (resto de trabajadores)',
    ],
  },
};

export const WithoutSuggestions: Story = {
  args: {
    reason: {
      field: 'antiguedad',
      value: '-5 anos',
      limit: 'la antiguedad no puede ser negativa',
    },
    suggestions: [],
  },
};

export const InChatContext: Story = {
  render: (args) => (
    <div className="max-w-2xl space-y-4 p-4 bg-muted/30 rounded-lg">
      <div className="bg-background p-4 rounded-lg border">
        <p className="text-sm text-muted-foreground mb-2">Usuario</p>
        <p>He trabajado 40 horas extra en un dia, cuanto me deben pagar?</p>
      </div>
      <div className="bg-background p-4 rounded-lg border">
        <p className="text-sm text-muted-foreground mb-2">WorkRules</p>
        <AlertInvalidData {...args} />
      </div>
    </div>
  ),
  args: {
    reason: {
      field: 'horas extra',
      value: '40 horas en un dia',
      limit: 'el Estatuto de los Trabajadores establece un maximo de 80 horas extra anuales',
      legalReference: 'Art. 35.2 ET',
    },
    suggestions: [
      '40 horas extra este mes',
      '40 horas nocturnas (no extra)',
    ],
  },
};
