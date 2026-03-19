import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChatPage } from './ChatPage';
import { AlertSMI } from '@ui/components/workrules/molecules/AlertSMI/AlertSMI';
import { AlertInvalidData } from '@ui/components/workrules/molecules/AlertInvalidData/AlertInvalidData';
import { AlertConflict } from '@ui/components/workrules/molecules/AlertConflict/AlertConflict';
import { MOCK_CONVENIOS, MOCK_PERFIL_HOSTELERIA, MOCK_CONVERSATIONS } from '@mocks/data/convenios';

const meta: Meta<typeof ChatPage> = {
  title: 'WorkRules/Pages/ChatPage',
  component: ChatPage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Página principal de chat para consultas de convenios colectivos. ' +
          'Incluye Sidebar (izquierda), área de chat (centro) y VariablesPanel (derecha).',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    mockConvenios: MOCK_CONVENIOS,
    mockConversations: MOCK_CONVERSATIONS,
    mockUserPlan: 'free',
  },
};

export default meta;
type Story = StoryObj<typeof ChatPage>;

/**
 * Estado por defecto - usuario sin convenio seleccionado.
 * Muestra el estado vacío con instrucciones para seleccionar un convenio.
 */
export const Default: Story = {
  args: {},
};

/**
 * Con convenio seleccionado y perfil JSON cargado.
 * El VariablesPanel muestra las variables del convenio.
 */
export const WithConvenioSelected: Story = {
  args: {
    mockPerfil: MOCK_PERFIL_HOSTELERIA,
  },
};

/**
 * Usuario Premium - muestra badge de Premium en el Sidebar.
 */
export const PremiumUser: Story = {
  args: {
    mockUserPlan: 'premium',
    mockPerfil: MOCK_PERFIL_HOSTELERIA,
  },
};

/**
 * Sin conversaciones previas - estado inicial del usuario.
 */
export const NoConversations: Story = {
  args: {
    mockConversations: [],
  },
};

/**
 * Sin convenios disponibles - edge case.
 */
export const NoConvenios: Story = {
  args: {
    mockConvenios: [],
    mockConversations: [],
  },
};

// ============================================================================
// Stories de Alertas del Protocolo (Estados D, E, F)
// ============================================================================

/**
 * Ejemplo de AlertSMI (Estado E) - cuando el salario calculado es menor al SMI.
 * Esta story muestra el componente de alerta de forma aislada dentro de un
 * contenedor que simula el área de chat.
 */
export const AlertSMIExample: Story = {
  render: () => (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <div className="flex flex-1 flex-col p-6">
        <h2 className="mb-4 text-lg font-semibold">
          Ejemplo de Alerta SMI (Estado E)
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Esta alerta aparece cuando el cálculo según convenio resulta inferior
          al Salario Mínimo Interprofesional vigente.
        </p>
        <div className="max-w-3xl">
          <AlertSMI
            calculatedAmount={1050}
            smiAmount={1134}
            adjustedAmount={1134}
            payPeriod="14-pagas"
            year={2026}
            onViewDetails={() => console.log('Ver detalles SMI')}
            onDismiss={() => console.log('Cerrar alerta SMI')}
          />
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Alerta que aparece cuando el salario calculado según convenio ' +
          'es inferior al SMI vigente. El sistema muestra el salario ajustado.',
      },
    },
  },
};

/**
 * Ejemplo de AlertInvalidData (Estado D) - cuando el usuario proporciona datos fuera de rango.
 */
export const AlertInvalidDataExample: Story = {
  render: () => (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <div className="flex flex-1 flex-col p-6">
        <h2 className="mb-4 text-lg font-semibold">
          Ejemplo de Alerta Datos Inválidos (Estado D)
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Esta alerta aparece cuando el usuario proporciona valores que exceden
          los límites legales establecidos.
        </p>
        <div className="max-w-3xl">
          <AlertInvalidData
            reason={{
              field: 'horas extra',
              value: 100,
              limit: 'el máximo legal es 80 horas anuales',
              legalReference: 'Art. 35.2 ET',
            }}
            suggestions={[
              '100 horas extra este año (distribuidas en meses)',
              '10 horas extra este mes',
            ]}
            onSelectSuggestion={(s) => console.log('Seleccionado:', s)}
            onDismiss={() => console.log('Cerrar alerta')}
          />
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Alerta que aparece cuando el usuario indica valores fuera del rango ' +
          'legal permitido. Incluye sugerencias para corregir el dato.',
      },
    },
  },
};

/**
 * Ejemplo de AlertConflict (Estado F) - cuando los datos se contradicen.
 */
export const AlertConflictExample: Story = {
  render: () => (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <div className="flex flex-1 flex-col p-6">
        <h2 className="mb-4 text-lg font-semibold">
          Ejemplo de Alerta Conflicto (Estado F)
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Esta alerta aparece cuando el usuario proporciona datos que se
          contradicen entre sí.
        </p>
        <div className="max-w-3xl">
          <AlertConflict
            conflict={{
              field1: { name: 'Tipo de jornada', value: 'Jornada completa' },
              field2: { name: 'Horas semanales', value: '20 horas' },
              explanation:
                'En el Convenio de Hostelería de Madrid, la jornada completa son ' +
                '40 horas semanales (1.826h anuales). Una jornada de 20h sería un ' +
                'contrato a tiempo parcial al 50%.',
            }}
            options={[
              { label: 'Jornada completa (40h/semana)', value: 'full-time' },
              { label: 'Tiempo parcial (20h/semana)', value: 'part-time' },
            ]}
            onSelectOption={(opt) => console.log('Opción seleccionada:', opt)}
            onDismiss={() => console.log('Cerrar alerta')}
          />
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Alerta que aparece cuando los datos proporcionados por el usuario ' +
          'se contradicen. El usuario debe seleccionar la opción correcta.',
      },
    },
  },
};
