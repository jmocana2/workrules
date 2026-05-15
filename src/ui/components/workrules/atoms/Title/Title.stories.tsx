import type { Meta, StoryObj } from '@storybook/react-vite';
import { Title } from './Title';

const meta: Meta<typeof Title> = {
  title: 'workrules/atoms/Title',
  component: Title,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Componente de título para respuestas del chat. Reemplaza los headings h1–h6 del markdown renderizado por Streamdown, con tamaños compactos apropiados para el contexto de conversación.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    as: {
      control: 'select',
      options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      description: 'Nivel semántico del heading',
    },
    children: {
      control: 'text',
      description: 'Contenido del título',
    },
    className: {
      control: 'text',
      description: 'Clases CSS adicionales',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Title>;

export const Default: Story = {
  args: {
    as: 'h2',
    children: 'Título de ejemplo',
  },
};

/**
 * Todos los niveles de heading h1–h6 en contexto de chat.
 * Muestra la escala tipográfica compacta diseñada para respuestas del asistente.
 */
export const AllLevels: Story = {
  render: () => (
    <div className="flex flex-col gap-1 p-6 max-w-md rounded-lg border bg-[var(--tokensColorsPageBackground)]">
      <Title as="h1">H1 — Título principal</Title>
      <Title as="h2">H2 — Sección principal</Title>
      <Title as="h3">H3 — Subsección</Title>
      <Title as="h4">H4 — Apartado</Title>
      <Title as="h5">H5 — Subapartado</Title>
      <Title as="h6">H6 — Nota secundaria</Title>
    </div>
  ),
};

/**
 * Simulación de una respuesta del chat con texto intercalado.
 * Representa el caso de uso real dentro de MessageResponse.
 */
export const InChatContext: Story = {
  render: () => (
    <div className="flex flex-col gap-2 p-6 max-w-lg rounded-lg border bg-[var(--tokensColorsPageBackground)] text-[var(--tokensColorsText)]">
      <Title as="h2">Jornada laboral en el convenio</Title>
      <p className="text-sm text-[var(--colorsNeutralNeutral11)]">
        Según el artículo 24 del convenio colectivo, la jornada máxima ordinaria es de 40 horas semanales.
      </p>
      <Title as="h3">Horas extraordinarias</Title>
      <p className="text-sm text-[var(--colorsNeutralNeutral11)]">
        Las horas extraordinarias no podrán superar 80 horas anuales y deberán compensarse económicamente o con descanso.
      </p>
      <Title as="h4">Cómputo anual</Title>
      <p className="text-sm text-[var(--colorsNeutralNeutral11)]">
        El cómputo anual equivale a 1.826 horas efectivas de trabajo.
      </p>
    </div>
  ),
};

/**
 * Comparación del tamaño de los títulos frente al texto base.
 * Útil para validar que la escala es legible sin resultar excesiva.
 */
export const ScaleComparison: Story = {
  render: () => (
    <div className="flex flex-col gap-3 p-6 max-w-md rounded-lg border bg-[var(--tokensColorsPageBackground)] text-[var(--tokensColorsText)]">
      {(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const).map((level) => (
        <div key={level} className="flex items-baseline gap-4 border-b border-[var(--colorsNeutralNeutral4)] pb-2 last:border-0">
          <span className="text-xs text-[var(--colorsNeutralNeutral9)] w-6 shrink-0">{level}</span>
          <Title as={level}>Convenio Colectivo Estatal</Title>
        </div>
      ))}
    </div>
  ),
};
