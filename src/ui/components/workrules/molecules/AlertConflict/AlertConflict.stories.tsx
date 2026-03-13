import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { AlertConflict } from './AlertConflict';

const meta: Meta<typeof AlertConflict> = {
  title: 'workrules/molecules/AlertConflict',
  component: AlertConflict,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
## AlertConflict

Alerta que se muestra cuando los datos proporcionados se contradicen entre si.

### Estado del Protocolo

Corresponde al **Estado F** del protocolo de interaccion.

### Ejemplo tipico

El usuario indica "jornada completa" pero menciona "20 horas semanales",
lo cual es una contradiccion que debe resolverse.

### Uso

\`\`\`tsx
<AlertConflict
  conflict={{
    field1: { name: 'tipo de jornada', value: 'completa' },
    field2: { name: 'horas semanales', value: '20 horas' },
    explanation: 'La jornada completa son 40 horas semanales. 20 horas seria tiempo parcial al 50%.',
  }}
  options={[
    { label: 'Jornada completa (40h)', value: 'completa' },
    { label: 'Tiempo parcial (20h)', value: 'parcial' },
  ]}
  onSelectOption={(opt) => console.log('Seleccionado:', opt)}
/>
\`\`\`
        `,
      },
    },
  },
  tags: ['autodocs'],
  args: {
    onSelectOption: fn(),
    onDismiss: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof AlertConflict>;

export const Default: Story = {
  args: {
    conflict: {
      field1: { name: 'tipo de jornada', value: 'jornada completa' },
      field2: { name: 'horas semanales', value: '20 horas' },
      explanation: 'En el convenio, la jornada completa son 40 horas semanales (1.826h anuales). Una jornada de 20h seria un contrato a tiempo parcial al 50%.',
    },
    options: [
      { label: 'Jornada completa (40h/semana)', value: 'completa' },
      { label: 'Tiempo parcial (20h/semana)', value: 'parcial' },
    ],
  },
};

export const CategoryVsLevel: Story = {
  args: {
    conflict: {
      field1: { name: 'categoria profesional', value: 'Gobernanta' },
      field2: { name: 'nivel salarial', value: 'Nivel 1 (basico)' },
      explanation: 'La categoria de Gobernanta corresponde a niveles superiores (3-5) segun el convenio. El Nivel 1 es para personal de limpieza basico.',
    },
    options: [
      { label: 'Gobernanta (Nivel 4)', value: 'gobernanta' },
      { label: 'Personal limpieza (Nivel 1)', value: 'limpieza' },
    ],
  },
};

export const HotelCategoryMismatch: Story = {
  args: {
    conflict: {
      field1: { name: 'establecimiento', value: 'hostal' },
      field2: { name: 'categoria', value: '5 estrellas' },
      explanation: 'Los hostales no tienen clasificacion por estrellas. Solo los hoteles pueden tener categoria de 1 a 5 estrellas.',
    },
    options: [
      { label: 'Hotel 5 estrellas', value: 'hotel_5' },
      { label: 'Hostal (sin estrellas)', value: 'hostal' },
    ],
  },
};

export const InChatContext: Story = {
  render: (args) => (
    <div className="max-w-2xl space-y-4 p-4 bg-muted/30 rounded-lg">
      <div className="bg-background p-4 rounded-lg border">
        <p className="text-sm text-muted-foreground mb-2">Usuario</p>
        <p>Tengo un contrato a jornada completa de 20 horas semanales</p>
      </div>
      <div className="bg-background p-4 rounded-lg border">
        <p className="text-sm text-muted-foreground mb-2">WorkRules</p>
        <AlertConflict {...args} />
      </div>
    </div>
  ),
  args: {
    conflict: {
      field1: { name: 'tipo de jornada', value: 'jornada completa' },
      field2: { name: 'horas semanales', value: '20 horas' },
      explanation: 'En el convenio, la jornada completa son 40 horas semanales. Una jornada de 20h seria un contrato a tiempo parcial al 50%.',
    },
    options: [
      { label: 'Jornada completa (40h/semana)', value: 'completa' },
      { label: 'Tiempo parcial (20h/semana)', value: 'parcial' },
    ],
  },
};
