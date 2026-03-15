import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { DataRequestCard } from './DataRequestCard';

const meta: Meta<typeof DataRequestCard> = {
  title: 'workrules/molecules/DataRequestCard',
  component: DataRequestCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
## DataRequestCard

Formulario interactivo para solicitar datos faltantes al usuario.

### Estado del Protocolo

Corresponde al **Estado B** (datos incompletos) del protocolo de interaccion.

### Comportamiento

- Muestra campos con opciones extraidas del Perfil JSON del convenio
- Maximo 3 preguntas antes de ofrecer alternativa
- Opcion "No lo se" muestra tabla con rangos

### Uso

\`\`\`tsx
<DataRequestCard
  title="Para calcular el salario exacto necesito:"
  convenioName="Hosteleria de Baleares"
  fields={[
    {
      name: 'zona',
      label: 'Zona del establecimiento',
      type: 'radio',
      required: true,
      options: [
        { value: 'nivel1', label: 'Palma (Nivel 1)' },
        { value: 'nivel2', label: 'Resto Mallorca (Nivel 2)' },
      ],
    },
  ]}
  onSubmit={(values) => console.log(values)}
  onSkip={() => console.log('Mostrar rangos')}
/>
\`\`\`
        `,
      },
    },
  },
  tags: ['autodocs'],
  args: {
    onSubmit: fn(),
    onSkip: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof DataRequestCard>;

export const Default: Story = {
  args: {
    title: 'Para calcular el salario exacto de recepcionista necesito:',
    convenioName: 'Hosteleria de Baleares',
    fields: [
      {
        name: 'zona',
        label: 'Zona del establecimiento',
        type: 'radio',
        required: true,
        options: [
          { value: 'nivel1', label: 'Palma (Nivel 1)' },
          { value: 'nivel2', label: 'Resto de Mallorca/Menorca (Nivel 2)' },
          { value: 'nivel3', label: 'Ibiza/Formentera (Nivel 3)' },
        ],
      },
      {
        name: 'categoria',
        label: 'Categoria del hotel',
        type: 'radio',
        required: true,
        options: [
          { value: '3', label: '3 estrellas' },
          { value: '4', label: '4 estrellas' },
          { value: '5', label: '5 estrellas' },
        ],
      },
    ],
    currentAttempt: 1,
    maxAttempts: 3,
  },
};

export const WithStarRating: Story = {
  args: {
    title: 'Indica la categoria del hotel:',
    convenioName: 'Hosteleria de Madrid',
    fields: [
      {
        name: 'estrellas',
        label: 'Estrellas del hotel',
        type: 'stars',
        required: true,
      },
    ],
  },
};

export const SingleField: Story = {
  args: {
    title: 'Cual es tu categoria profesional?',
    convenioName: 'Construccion Estatal',
    fields: [
      {
        name: 'categoria',
        label: 'Categoria profesional',
        type: 'radio',
        required: true,
        options: [
          { value: 'peon', label: 'Peon' },
          { value: 'oficial1', label: 'Oficial de 1a' },
          { value: 'oficial2', label: 'Oficial de 2a' },
          { value: 'encargado', label: 'Encargado de obra' },
        ],
      },
    ],
  },
};

export const WithDescriptions: Story = {
  args: {
    title: 'Selecciona el tipo de jornada:',
    convenioName: 'Consultoras TIC',
    fields: [
      {
        name: 'jornada',
        label: 'Tipo de jornada',
        type: 'radio',
        required: true,
        helpText: 'Segun tu contrato de trabajo',
        options: [
          {
            value: 'completa',
            label: 'Jornada completa',
            description: '40 horas semanales (1.826h anuales)',
          },
          {
            value: 'parcial',
            label: 'Jornada parcial',
            description: 'Menos de 40 horas semanales',
          },
          {
            value: 'reducida',
            label: 'Jornada reducida',
            description: 'Por cuidado de menores u otras causas',
          },
        ],
      },
    ],
  },
};

export const SecondAttempt: Story = {
  args: {
    title: 'Necesito un dato adicional:',
    convenioName: 'Hosteleria de Valencia',
    currentAttempt: 2,
    maxAttempts: 3,
    fields: [
      {
        name: 'antiguedad',
        label: 'Anos de antiguedad en la empresa',
        type: 'radio',
        required: true,
        options: [
          { value: '0', label: 'Menos de 1 ano' },
          { value: '1-3', label: '1 a 3 anos' },
          { value: '3-5', label: '3 a 5 anos' },
          { value: '5+', label: 'Mas de 5 anos' },
        ],
      },
    ],
  },
};

export const InChatContext: Story = {
  render: (args) => (
    <div className="max-w-2xl space-y-4 p-4 bg-muted/30 rounded-lg">
      <div className="bg-background p-4 rounded-lg border">
        <p className="text-sm text-foreground mb-2">Usuario</p>
        <p>Cuanto gana un recepcionista en Baleares?</p>
      </div>
      <div className="bg-background p-4 rounded-lg border">
        <p className="text-sm text-foreground mb-2">WorkRules</p>
        <p className="mb-4">
          He localizado el Convenio de Hosteleria de Baleares.
        </p>
        <DataRequestCard {...args} />
      </div>
    </div>
  ),
  args: {
    title: 'Para calcular el salario exacto necesito dos datos adicionales:',
    convenioName: 'Hosteleria de Baleares',
    fields: [
      {
        name: 'zona',
        label: 'Zona del establecimiento',
        type: 'radio',
        required: true,
        options: [
          { value: 'nivel1', label: 'Palma (Nivel 1)' },
          { value: 'nivel2', label: 'Resto de Mallorca/Menorca (Nivel 2)' },
          { value: 'nivel3', label: 'Ibiza/Formentera (Nivel 3)' },
        ],
      },
      {
        name: 'categoria',
        label: 'Categoria del hotel',
        type: 'radio',
        required: true,
        options: [
          { value: '3', label: '3 estrellas' },
          { value: '4', label: '4 estrellas' },
          { value: '5', label: '5 estrellas' },
        ],
      },
    ],
  },
};
