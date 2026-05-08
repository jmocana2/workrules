import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { UploadProgress } from './UploadProgress';

/**
 * UploadProgress muestra el estado de carga de un archivo de convenio colectivo
 *
 * - **Uploading**: Muestra barra de progreso (0-100%)
 * - **Validating**: Indica que se está validando la estructura del PDF
 * - **Processing**: Muestra mensaje adicional sobre tiempo de procesamiento
 * - **Ready**: Indica que el convenio está listo para consultar
 * - **Error**: Muestra mensaje de error personalizado
 * - Soporta botón de cancelar durante los estados uploading, validating y processing
 * - Utiliza colores semánticos del sistema de diseño (accent, info, warning, success, error)
 */
const meta = {
  title: 'WorkRules/Organisms/ConvenioUploader/UploadProgress',
  component: UploadProgress,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Componente que muestra el progreso de carga y procesamiento de archivos PDF de convenios colectivos. Incluye estados de uploading, validating, processing, ready y error con indicadores visuales y mensajes apropiados.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['uploading', 'validating', 'processing', 'ready', 'error'],
      description: 'Estado actual del proceso de carga',
    },
    progress: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
      description: 'Progreso de carga (0-100), solo visible en estado uploading',
    },
    fileName: {
      control: 'text',
      description: 'Nombre del archivo que se está cargando',
    },
    errorMessage: {
      control: 'text',
      description: 'Mensaje de error a mostrar cuando status es "error"',
    },
    onCancel: {
      description: 'Callback cuando se hace clic en el botón cancelar',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '400px', padding: '20px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof UploadProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Estado inicial de carga con 0% de progreso
 */
export const Uploading0: Story = {
  args: {
    status: 'uploading',
    progress: 0,
    fileName: 'convenio-hosteleria-madrid.pdf',
  },
};

/**
 * Estado de carga al 50% de progreso
 */
export const Uploading50: Story = {
  args: {
    status: 'uploading',
    progress: 50,
    fileName: 'convenio-hosteleria-madrid.pdf',
  },
};

/**
 * Estado de carga completada al 100%
 */
export const Uploading100: Story = {
  args: {
    status: 'uploading',
    progress: 100,
    fileName: 'convenio-hosteleria-madrid.pdf',
  },
};

/**
 * Estado de validación de estructura del PDF
 */
export const Validating: Story = {
  args: {
    status: 'validating',
    fileName: 'convenio-hosteleria-madrid.pdf',
  },
};

/**
 * Estado de procesamiento con mensaje adicional
 * Muestra un hint sobre que puede tardar unos minutos
 */
export const Processing: Story = {
  args: {
    status: 'processing',
    fileName: 'convenio-hosteleria-madrid.pdf',
  },
};

/**
 * Estado de procesamiento completado y listo para consultar
 */
export const Ready: Story = {
  args: {
    status: 'ready',
    fileName: 'convenio-hosteleria-madrid.pdf',
  },
};

/**
 * Estado de error con mensaje personalizado
 */
export const ErrorState: Story = {
  args: {
    status: 'error',
    fileName: 'convenio-hosteleria-madrid.pdf',
    errorMessage: 'El archivo excede el límite de 10MB',
  },
};

/**
 * Estado de carga con botón de cancelar funcional
 */
export const WithCancel: Story = {
  args: {
    status: 'uploading',
    progress: 35,
    fileName: 'convenio-hosteleria-madrid.pdf',
    onCancel: fn(),
  },
};

/**
 * Muestra todos los estados disponibles en secuencia
 */
export const AllStates: Story = {
  args: {
    status: 'uploading',
    progress: 25,
    fileName: 'convenio-metal-estatal.pdf',
  },
  render: () => (
    <div className="flex flex-col gap-4" style={{ width: '400px' }}>
      <UploadProgress
        status="uploading"
        progress={25}
        fileName="convenio-metal-estatal.pdf"
        onCancel={fn()}
      />
      <UploadProgress
        status="validating"
        fileName="convenio-construccion-madrid.pdf"
        onCancel={fn()}
      />
      <UploadProgress
        status="processing"
        fileName="convenio-comercio-barcelona.pdf"
        onCancel={fn()}
      />
      <UploadProgress
        status="ready"
        fileName="convenio-hosteleria-madrid.pdf"
      />
      <UploadProgress
        status="error"
        fileName="convenio-invalido.pdf"
        errorMessage="El archivo no es un PDF válido"
      />
    </div>
  ),
};

/**
 * Simulación de progreso animado
 * Muestra diferentes porcentajes de carga
 */
export const ProgressSteps: Story = {
  args: {
    status: 'uploading',
    progress: 10,
    fileName: 'convenio-transporte.pdf',
  },
  render: () => (
    <div className="flex flex-col gap-4" style={{ width: '400px' }}>
      <UploadProgress
        status="uploading"
        progress={10}
        fileName="convenio-transporte.pdf"
        onCancel={fn()}
      />
      <UploadProgress
        status="uploading"
        progress={30}
        fileName="convenio-transporte.pdf"
        onCancel={fn()}
      />
      <UploadProgress
        status="uploading"
        progress={60}
        fileName="convenio-transporte.pdf"
        onCancel={fn()}
      />
      <UploadProgress
        status="uploading"
        progress={90}
        fileName="convenio-transporte.pdf"
        onCancel={fn()}
      />
      <UploadProgress
        status="uploading"
        progress={100}
        fileName="convenio-transporte.pdf"
      />
    </div>
  ),
};

/**
 * Diferentes tipos de errores
 */
export const ErrorVariants: Story = {
  args: {
    status: 'error',
    fileName: 'archivo-muy-grande.pdf',
    errorMessage: 'El archivo excede el límite de 10MB',
  },
  render: () => (
    <div className="flex flex-col gap-4" style={{ width: '400px' }}>
      <UploadProgress
        status="error"
        fileName="archivo-muy-grande.pdf"
        errorMessage="El archivo excede el límite de 10MB"
      />
      <UploadProgress
        status="error"
        fileName="documento.docx"
        errorMessage="Solo se permiten archivos PDF"
      />
      <UploadProgress
        status="error"
        fileName="convenio-corrupto.pdf"
        errorMessage="El archivo está dañado y no se puede leer"
      />
      <UploadProgress
        status="error"
        fileName="convenio-duplicado.pdf"
        errorMessage="Este convenio ya existe en el sistema"
      />
    </div>
  ),
};

/**
 * Nombres de archivo largos que se truncan
 */
export const LongFileName: Story = {
  args: {
    status: 'uploading',
    progress: 65,
    fileName:
      'convenio-colectivo-estatal-de-la-industria-del-metal-y-fabricacion-de-productos-metalicos-2024-2028.pdf',
    onCancel: fn(),
  },
};

/**
 * Estado de procesamiento con mensaje de tiempo estimado
 * Muestra el mensaje adicional que aparece durante el procesamiento
 */
export const ProcessingWithMessage: Story = {
  args: {
    status: 'processing',
    fileName: 'convenio-hosteleria-madrid.pdf',
    processingProgress: 0,
    estimatedTimeLeft: 180, // 3 minutos
    onCancel: fn(),
  },
};

/**
 * Procesamiento al 30% con tiempo estimado medio
 */
export const Processing30: Story = {
  args: {
    status: 'processing',
    fileName: 'convenio-construccion-barcelona.pdf',
    processingProgress: 30,
    estimatedTimeLeft: 120, // 2 minutos
    onCancel: fn(),
  },
};

/**
 * Procesamiento al 65% con tiempo estimado corto
 */
export const Processing65: Story = {
  args: {
    status: 'processing',
    fileName: 'convenio-metal-estatal.pdf',
    processingProgress: 65,
    estimatedTimeLeft: 45, // 45 segundos
    onCancel: fn(),
  },
};

/**
 * Procesamiento al 95% finalizando
 */
export const Processing95: Story = {
  args: {
    status: 'processing',
    fileName: 'convenio-comercio-madrid.pdf',
    processingProgress: 95,
    estimatedTimeLeft: 5, // 5 segundos
    onCancel: fn(),
  },
};

/**
 * Diferentes estados de procesamiento con mensajes
 */
export const ProcessingStates: Story = {
  args: {
    status: 'processing',
    fileName: 'convenio-ejemplo.pdf',
    processingProgress: 50,
    estimatedTimeLeft: 90,
  },
  render: () => (
    <div className="flex flex-col gap-4" style={{ width: '400px' }}>
      <UploadProgress
        status="processing"
        fileName="convenio-inicio.pdf"
        processingProgress={0}
        estimatedTimeLeft={240}
        onCancel={fn()}
      />
      <UploadProgress
        status="processing"
        fileName="convenio-progreso-bajo.pdf"
        processingProgress={15}
        estimatedTimeLeft={200}
        onCancel={fn()}
      />
      <UploadProgress
        status="processing"
        fileName="convenio-mitad.pdf"
        processingProgress={50}
        estimatedTimeLeft={90}
        onCancel={fn()}
      />
      <UploadProgress
        status="processing"
        fileName="convenio-casi-listo.pdf"
        processingProgress={85}
        estimatedTimeLeft={20}
        onCancel={fn()}
      />
      <UploadProgress
        status="processing"
        fileName="convenio-finalizando.pdf"
        processingProgress={98}
        estimatedTimeLeft={2}
        onCancel={fn()}
      />
    </div>
  ),
};
