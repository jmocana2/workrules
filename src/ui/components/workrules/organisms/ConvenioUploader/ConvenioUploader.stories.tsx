import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ConvenioUploader } from './ConvenioUploader';

/**
 * ConvenioUploader es el componente principal que orquesta el flujo completo
 * de subida de convenios colectivos en formato PDF.
 *
 * ## Flujo de estados:
 * 1. **idle**: Muestra DropZone para seleccionar archivo
 * 2. **uploading**: Barra de progreso mientras sube a Storage
 * 3. **validating**: Validando estructura del PDF
 * 4. **preview**: Muestra datos extraídos + selector de visibilidad
 * 5. **processing**: Procesando convenio en n8n (puede tardar minutos)
 * 6. **ready**: Convenio listo para consultar
 * 7. **error**: Muestra mensaje de error + botón "Intentar de nuevo"
 *
 * ## Características:
 * - Solo visible para usuarios premium
 * - Validación de archivos (PDF, máx 10MB)
 * - Selector de visibilidad (público/privado)
 * - Polling automático del estado de procesamiento
 * - Cancelación de subida en progreso
 */
const meta = {
  title: 'WorkRules/Organisms/ConvenioUploader',
  component: ConvenioUploader,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Componente completo para la subida de convenios colectivos. Maneja todo el flujo desde la selección del archivo hasta el procesamiento final, pasando por validación, preview y configuración de visibilidad.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isPremium: {
      control: 'boolean',
      description: 'Si es true, muestra el uploader. Si es false, no renderiza nada.',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    onConvenioReady: {
      description: 'Callback cuando el convenio está listo (estado "activo")',
      action: 'convenio-ready',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '400px', padding: '20px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ConvenioUploader>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Usuario premium puede ver el uploader
 */
export const Premium: Story = {
  args: {
    isPremium: true,
    onConvenioReady: fn(),
  },
};

/**
 * Usuario no premium - no renderiza nada
 */
export const NonPremium: Story = {
  args: {
    isPremium: false,
    onConvenioReady: fn(),
  },
  render: (args) => (
    <div>
      <p className="text-sm text-[var(--colorsNeutralNeutral11)] mb-4">
        Usuario no premium - el componente no renderiza nada:
      </p>
      <ConvenioUploader {...args} />
      <p className="text-xs text-[var(--colorsNeutralNeutral9)] mt-4">
        (En producción, esto se controlaría con el sistema de autenticación)
      </p>
    </div>
  ),
};

/**
 * Flujo completo documentado
 */
export const FlowDocumentation: Story = {
  args: {
    isPremium: true,
    onConvenioReady: fn(),
  },
  render: () => (
    <div style={{ width: '600px' }}>
      <h3 className="text-lg font-semibold mb-4">Flujo de Subida de Convenios</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm">
        <li>
          <strong>Estado idle:</strong> Usuario ve DropZone y puede arrastrar/seleccionar PDF
        </li>
        <li>
          <strong>Validación client-side:</strong> Verifica tipo MIME y tamaño ≤ 10MB
        </li>
        <li>
          <strong>Estado uploading:</strong> Sube archivo a Supabase Storage con progress bar
        </li>
        <li>
          <strong>Estado validating:</strong> Extrae metadata básica del archivo
        </li>
        <li>
          <strong>Estado preview:</strong> Muestra datos + selector de visibilidad
        </li>
        <li>
          <strong>Usuario confirma:</strong> Llama a Edge Function upload-convenio
        </li>
        <li>
          <strong>Estado processing:</strong> Polling cada 10s hasta que estado = "activo"
        </li>
        <li>
          <strong>Estado ready:</strong> Convenio disponible para consultas
        </li>
      </ol>
      <div className="mt-6 p-4 bg-[var(--colorsSemanticInfo3)] border border-[var(--colorsSemanticInfo9)] rounded-md">
        <p className="text-sm text-[var(--colorsSemanticInfo11)]">
          <strong>Nota:</strong> El procesamiento en n8n (LlamaParse + Claude) puede tardar varios minutos.
          El componente maneja el polling automáticamente.
        </p>
      </div>
    </div>
  ),
};

/**
 * Información sobre visibilidad
 */
export const VisibilityInfo: Story = {
  args: {
    isPremium: true,
    onConvenioReady: fn(),
  },
  render: () => (
    <div style={{ width: '500px' }}>
      <h3 className="text-lg font-semibold mb-4">Opciones de Visibilidad</h3>
      <div className="space-y-4">
        <div className="p-4 border border-[var(--colorsNeutralNeutral6)] rounded-md">
          <h4 className="font-medium mb-2">🔒 Privado (por defecto)</h4>
          <p className="text-sm text-[var(--colorsNeutralNeutral11)]">
            Solo el usuario que lo subió puede consultar este convenio. Ideal para:
          </p>
          <ul className="list-disc list-inside text-sm text-[var(--colorsNeutralNeutral11)] mt-2 space-y-1">
            <li>Convenios de empresa específicos</li>
            <li>Convenios en proceso de revisión</li>
            <li>Uso personal o de equipo pequeño</li>
          </ul>
        </div>
        <div className="p-4 border border-[var(--colorsNeutralNeutral6)] rounded-md">
          <h4 className="font-medium mb-2">🌍 Público</h4>
          <p className="text-sm text-[var(--colorsNeutralNeutral11)]">
            Tras revisión, el convenio estará disponible para toda la comunidad. Contribuye al catálogo común.
          </p>
          <ul className="list-disc list-inside text-sm text-[var(--colorsNeutralNeutral11)] mt-2 space-y-1">
            <li>Convenios sectoriales generales</li>
            <li>Convenios autonómicos/estatales</li>
            <li>Ayuda a otros usuarios</li>
          </ul>
        </div>
      </div>
    </div>
  ),
};
