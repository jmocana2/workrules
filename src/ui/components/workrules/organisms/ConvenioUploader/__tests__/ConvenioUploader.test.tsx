import * as useConvenioUploadModule from '@/ui/hooks/useConvenioUpload';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConvenioUploader } from '../ConvenioUploader';

// Mock del hook useConvenioUpload
const mockReset = vi.fn();
const mockUploadFile = vi.fn();
const mockConfirmUpload = vi.fn();
const mockSetVisibility = vi.fn();

vi.mock('@/ui/hooks/useConvenioUpload', () => ({
  useConvenioUpload: vi.fn(),
}));

describe('ConvenioUploader', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock por defecto: estado idle
    vi.mocked(useConvenioUploadModule.useConvenioUpload).mockReturnValue({
      state: { status: 'idle' },
      visibility: 'privado',
      setVisibility: mockSetVisibility,
      uploadFile: mockUploadFile,
      confirmUpload: mockConfirmUpload,
      reset: mockReset,
    });
  });

  describe('Control de acceso premium', () => {
    it('no renderiza nada si isPremium es false', () => {
      const { container } = render(<ConvenioUploader isPremium={false} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('renderiza el uploader si isPremium es true', () => {
      render(<ConvenioUploader isPremium={true} />);
      // En estado idle debe mostrar el DropZone
      expect(screen.getByLabelText(/subir archivo pdf/i)).toBeInTheDocument();
    });
  });

  describe('Estado idle', () => {
    it('muestra el DropZone', () => {
      render(<ConvenioUploader isPremium={true} />);
      expect(screen.getByLabelText(/subir archivo pdf/i)).toBeInTheDocument();
      expect(screen.getByText(/arrastra pdf aqui/i)).toBeInTheDocument();
    });

    it('no muestra otros componentes', () => {
      render(<ConvenioUploader isPremium={true} />);
      expect(screen.queryByText(/preview del convenio/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/visibilidad/i)).not.toBeInTheDocument();
    });
  });

  describe('Estado uploading', () => {
    beforeEach(() => {
      vi.mocked(useConvenioUploadModule.useConvenioUpload).mockReturnValue({
        state: { status: 'uploading', progress: 45, fileName: 'test.pdf' },
        visibility: 'privado',
        setVisibility: mockSetVisibility,
        uploadFile: mockUploadFile,
        confirmUpload: mockConfirmUpload,
        reset: mockReset,
      });
    });

    it('muestra el componente UploadProgress', () => {
      render(<ConvenioUploader isPremium={true} />);
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
      expect(screen.getByText(/subiendo/i)).toBeInTheDocument();
    });

    it('no muestra el DropZone', () => {
      render(<ConvenioUploader isPremium={true} />);
      expect(screen.queryByText(/arrastra pdf aqui/i)).not.toBeInTheDocument();
    });
  });

  describe('Estado preview', () => {
    beforeEach(() => {
      vi.mocked(useConvenioUploadModule.useConvenioUpload).mockReturnValue({
        state: {
          status: 'preview',
          fileName: 'convenio-test.pdf',
          previewData: {
            nombre: 'Convenio de Hostelería',
            ambito: 'provincial',
            paginas: 100,
          },
        },
        visibility: 'privado',
        setVisibility: mockSetVisibility,
        uploadFile: mockUploadFile,
        confirmUpload: mockConfirmUpload,
        reset: mockReset,
      });
    });

    it('muestra el ConvenioPreview', () => {
      render(<ConvenioUploader isPremium={true} />);
      expect(screen.getByText('Preview del convenio')).toBeInTheDocument();
      expect(screen.getByText('Convenio de Hostelería')).toBeInTheDocument();
    });

    it('muestra el VisibilitySelector', () => {
      render(<ConvenioUploader isPremium={true} />);
      expect(screen.getByText(/visibilidad:/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/privado/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/público/i)).toBeInTheDocument();
    });
  });

  describe('Estado processing', () => {
    beforeEach(() => {
      vi.mocked(useConvenioUploadModule.useConvenioUpload).mockReturnValue({
        state: {
          status: 'processing',
          fileName: 'convenio.pdf',
          convenioId: 'abc-123',
          progress: 0,
          stage: 'queued',
          stageLabel: 'En cola…',
        },
        visibility: 'privado',
        setVisibility: mockSetVisibility,
        uploadFile: mockUploadFile,
        confirmUpload: mockConfirmUpload,
        reset: mockReset,
      });
    });

    it('muestra el mensaje de procesamiento', () => {
      render(<ConvenioUploader isPremium={true} />);
      expect(screen.getByText(/procesando convenio/i)).toBeInTheDocument();
      expect(screen.getByText(/en cola/i)).toBeInTheDocument();
    });
  });

  describe('Estado ready', () => {
    beforeEach(() => {
      vi.mocked(useConvenioUploadModule.useConvenioUpload).mockReturnValue({
        state: {
          status: 'ready',
          fileName: 'convenio.pdf',
          convenioId: 'abc-123',
        },
        visibility: 'privado',
        setVisibility: mockSetVisibility,
        uploadFile: mockUploadFile,
        confirmUpload: mockConfirmUpload,
        reset: mockReset,
      });
    });

    it('muestra el mensaje de éxito', () => {
      render(<ConvenioUploader isPremium={true} />);
      expect(screen.getByText(/listo para consultar/i)).toBeInTheDocument();
    });
  });

  describe('Estado error', () => {
    beforeEach(() => {
      vi.mocked(useConvenioUploadModule.useConvenioUpload).mockReturnValue({
        state: {
          status: 'error',
          fileName: 'convenio.pdf',
          error: 'Error al procesar el archivo',
        },
        visibility: 'privado',
        setVisibility: mockSetVisibility,
        uploadFile: mockUploadFile,
        confirmUpload: mockConfirmUpload,
        reset: mockReset,
      });
    });

    it('muestra el mensaje de error', () => {
      render(<ConvenioUploader isPremium={true} />);
      expect(screen.getByText('Error al procesar el archivo')).toBeInTheDocument();
    });

    it('muestra el botón "Intentar de nuevo"', () => {
      render(<ConvenioUploader isPremium={true} />);
      expect(screen.getByText(/intentar de nuevo/i)).toBeInTheDocument();
    });

    it('llama a reset al hacer click en "Intentar de nuevo"', async () => {
      const user = userEvent.setup();
      render(<ConvenioUploader isPremium={true} />);

      const retryButton = screen.getByText(/intentar de nuevo/i);
      await user.click(retryButton);

      expect(mockReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('Callback onConvenioReady', () => {
    it('se llama cuando el hook llama a onSuccess', () => {
      const mockOnConvenioReady = vi.fn();
      let capturedOnSuccess: ((id: string) => void) | undefined;

      vi.mocked(useConvenioUploadModule.useConvenioUpload).mockImplementation((options) => {
        capturedOnSuccess = options?.onSuccess;
        return {
          state: { status: 'idle' },
          visibility: 'privado',
          setVisibility: mockSetVisibility,
          uploadFile: mockUploadFile,
          confirmUpload: mockConfirmUpload,
          reset: mockReset,
        };
      });

      render(<ConvenioUploader isPremium={true} onConvenioReady={mockOnConvenioReady} />);

      // Simular que el hook llama a onSuccess
      expect(capturedOnSuccess).toBeDefined();
      capturedOnSuccess?.('convenio-id-123');

      expect(mockOnConvenioReady).toHaveBeenCalledWith('convenio-id-123');
    });
  });
});
