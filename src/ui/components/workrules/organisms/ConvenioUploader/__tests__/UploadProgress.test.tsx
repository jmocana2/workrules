import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UploadProgress, type UploadStatus } from '../UploadProgress';

describe('UploadProgress', () => {
  const defaultProps = {
    fileName: 'convenio-test.pdf',
    status: 'uploading' as UploadStatus,
  };

  describe('Rendering básico', () => {
    it('renderiza el componente sin errores', () => {
      render(<UploadProgress {...defaultProps} />);

      expect(screen.getByTitle('convenio-test.pdf')).toBeInTheDocument();
    });

    it('muestra el nombre del archivo', () => {
      render(<UploadProgress {...defaultProps} />);

      expect(screen.getByText('convenio-test.pdf')).toBeInTheDocument();
    });

    it('muestra el icono correcto para estado "uploading"', () => {
      const { container } = render(<UploadProgress {...defaultProps} status="uploading" />);

      const icon = container.querySelector('span[aria-hidden="true"]');
      expect(icon).toHaveTextContent('📤');
    });

    it('muestra el icono correcto para estado "validating"', () => {
      const { container } = render(<UploadProgress {...defaultProps} status="validating" />);

      const icon = container.querySelector('span[aria-hidden="true"]');
      expect(icon).toHaveTextContent('🔍');
    });

    it('muestra el icono correcto para estado "processing"', () => {
      const { container } = render(<UploadProgress {...defaultProps} status="processing" />);

      const icon = container.querySelector('span[aria-hidden="true"]');
      expect(icon).toHaveTextContent('⏳');
    });

    it('muestra el icono correcto para estado "ready"', () => {
      const { container } = render(<UploadProgress {...defaultProps} status="ready" />);

      const icon = container.querySelector('span[aria-hidden="true"]');
      expect(icon).toHaveTextContent('✅');
    });

    it('muestra el icono correcto para estado "error"', () => {
      const { container } = render(<UploadProgress {...defaultProps} status="error" />);

      const icon = container.querySelector('span[aria-hidden="true"]');
      expect(icon).toHaveTextContent('❌');
    });
  });

  describe('Estado "uploading"', () => {
    it('muestra la barra de progreso', () => {
      render(<UploadProgress {...defaultProps} status="uploading" progress={50} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
    });

    it('actualiza el ancho de la barra según el porcentaje', () => {
      render(<UploadProgress {...defaultProps} status="uploading" progress={75} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveStyle({ width: '75%' });
    });

    it('muestra el porcentaje en el texto', () => {
      render(<UploadProgress {...defaultProps} status="uploading" progress={45} />);

      expect(screen.getByText(/45%/)).toBeInTheDocument();
    });

    it('muestra "Subiendo..." como label', () => {
      render(<UploadProgress {...defaultProps} status="uploading" progress={30} />);

      expect(screen.getByText(/Subiendo\.\.\./)).toBeInTheDocument();
    });

    it('muestra botón cancelar si onCancel está presente', () => {
      const onCancel = vi.fn();
      render(<UploadProgress {...defaultProps} status="uploading" onCancel={onCancel} />);

      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
    });

    it('no muestra botón cancelar si onCancel no está presente', () => {
      render(<UploadProgress {...defaultProps} status="uploading" />);

      expect(screen.queryByRole('button', { name: /cancelar/i })).not.toBeInTheDocument();
    });

    it('limita el progreso a máximo 100%', () => {
      render(<UploadProgress {...defaultProps} status="uploading" progress={150} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveStyle({ width: '100%' });
    });

    it('limita el progreso a mínimo 0%', () => {
      render(<UploadProgress {...defaultProps} status="uploading" progress={-10} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveStyle({ width: '0%' });
    });

    it('usa progreso 0 por defecto si no se proporciona', () => {
      render(<UploadProgress {...defaultProps} status="uploading" />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveStyle({ width: '0%' });
      expect(screen.getByText(/0%/)).toBeInTheDocument();
    });
  });

  describe('Estado "validating"', () => {
    it('muestra el texto "Validando estructura..."', () => {
      render(<UploadProgress {...defaultProps} status="validating" />);

      expect(screen.getByText('Validando estructura...')).toBeInTheDocument();
    });

    it('NO muestra barra de progreso', () => {
      render(<UploadProgress {...defaultProps} status="validating" />);

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    it('usa el color correcto (Info)', () => {
      render(<UploadProgress {...defaultProps} status="validating" />);

      const statusLabel = screen.getByText('Validando estructura...');
      expect(statusLabel).toHaveStyle({ color: 'var(--colorsSemanticInfo9)' });
    });
  });

  describe('Estado "processing"', () => {
    it('muestra el texto "Procesando convenio..." con porcentaje', () => {
      render(<UploadProgress {...defaultProps} status="processing" processingProgress={45} />);

      expect(screen.getByText(/Procesando convenio\.\.\. 45%/)).toBeInTheDocument();
    });

    it('muestra tiempo estimado restante', () => {
      render(<UploadProgress {...defaultProps} status="processing" estimatedTimeLeft={90} />);

      expect(
        screen.getByText(/Tiempo estimado restante:/i)
      ).toBeInTheDocument();
    });

    it('muestra mensaje descriptivo del procesamiento', () => {
      render(<UploadProgress {...defaultProps} status="processing" />);

      expect(
        screen.getByText(/Extrayendo texto, generando embeddings/i)
      ).toBeInTheDocument();
    });

    it('usa el color correcto (Warning)', () => {
      render(<UploadProgress {...defaultProps} status="processing" processingProgress={50} />);

      const statusLabel = screen.getByText(/Procesando convenio\.\.\. 50%/);
      expect(statusLabel).toHaveStyle({ color: 'var(--colorsSemanticWarning9)' });
    });

    it('muestra botón cancelar si onCancel está presente', () => {
      const onCancel = vi.fn();
      render(<UploadProgress {...defaultProps} status="processing" onCancel={onCancel} />);

      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
    });

    it('SÍ muestra barra de progreso', () => {
      render(<UploadProgress {...defaultProps} status="processing" processingProgress={60} />);

      const progressBar = screen.queryByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
    });

    it('actualiza el ancho de la barra según el porcentaje de procesamiento', () => {
      render(<UploadProgress {...defaultProps} status="processing" processingProgress={75} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveStyle({ width: '75%' });
    });
  });

  describe('Estado "ready"', () => {
    it('muestra el texto "Listo para consultar"', () => {
      render(<UploadProgress {...defaultProps} status="ready" />);

      expect(screen.getByText('Listo para consultar')).toBeInTheDocument();
    });

    it('usa el color correcto (Success)', () => {
      render(<UploadProgress {...defaultProps} status="ready" />);

      const statusLabel = screen.getByText('Listo para consultar');
      expect(statusLabel).toHaveStyle({ color: 'var(--colorsSemanticSuccess9)' });
    });

    it('NO muestra botón cancelar aunque onCancel esté presente', () => {
      const onCancel = vi.fn();
      render(<UploadProgress {...defaultProps} status="ready" onCancel={onCancel} />);

      expect(screen.queryByRole('button', { name: /cancelar/i })).not.toBeInTheDocument();
    });

    it('NO muestra barra de progreso', () => {
      render(<UploadProgress {...defaultProps} status="ready" />);

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    it('NO muestra mensaje adicional', () => {
      render(<UploadProgress {...defaultProps} status="ready" />);

      expect(
        screen.queryByText(/Esto puede tardar unos minutos/i)
      ).not.toBeInTheDocument();
    });
  });

  describe('Estado "error"', () => {
    it('muestra el errorMessage en lugar del label', () => {
      render(
        <UploadProgress
          {...defaultProps}
          status="error"
          errorMessage="El archivo es demasiado grande"
        />
      );

      expect(screen.getByText('El archivo es demasiado grande')).toBeInTheDocument();
      expect(screen.queryByText('Error')).not.toBeInTheDocument();
    });

    it('muestra el label "Error" si no hay errorMessage', () => {
      render(<UploadProgress {...defaultProps} status="error" />);

      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('usa el color correcto (Error)', () => {
      render(<UploadProgress {...defaultProps} status="error" />);

      const errorLabel = screen.getByText('Error');
      expect(errorLabel).toHaveStyle({ color: 'var(--colorsSemanticError9)' });
    });

    it('NO muestra botón cancelar aunque onCancel esté presente', () => {
      const onCancel = vi.fn();
      render(
        <UploadProgress
          {...defaultProps}
          status="error"
          errorMessage="Error de validación"
          onCancel={onCancel}
        />
      );

      expect(screen.queryByRole('button', { name: /cancelar/i })).not.toBeInTheDocument();
    });

    it('NO muestra barra de progreso', () => {
      render(<UploadProgress {...defaultProps} status="error" />);

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  describe('Interacciones', () => {
    it('click en botón cancelar llama a onCancel', () => {
      const onCancel = vi.fn();
      render(<UploadProgress {...defaultProps} status="uploading" onCancel={onCancel} />);

      const cancelButton = screen.getByRole('button', { name: /cancelar/i });
      fireEvent.click(cancelButton);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('botón cancelar no aparece en estado "ready"', () => {
      const onCancel = vi.fn();
      render(<UploadProgress {...defaultProps} status="ready" onCancel={onCancel} />);

      expect(screen.queryByRole('button', { name: /cancelar/i })).not.toBeInTheDocument();
    });

    it('botón cancelar no aparece en estado "error"', () => {
      const onCancel = vi.fn();
      render(<UploadProgress {...defaultProps} status="error" onCancel={onCancel} />);

      expect(screen.queryByRole('button', { name: /cancelar/i })).not.toBeInTheDocument();
    });

    it('botón cancelar aparece en estado "uploading"', () => {
      const onCancel = vi.fn();
      render(<UploadProgress {...defaultProps} status="uploading" onCancel={onCancel} />);

      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
    });

    it('botón cancelar aparece en estado "validating"', () => {
      const onCancel = vi.fn();
      render(<UploadProgress {...defaultProps} status="validating" onCancel={onCancel} />);

      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
    });

    it('botón cancelar aparece en estado "processing"', () => {
      const onCancel = vi.fn();
      render(<UploadProgress {...defaultProps} status="processing" onCancel={onCancel} />);

      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
    });
  });

  describe('Accesibilidad', () => {
    it('progress bar tiene atributo aria-valuenow', () => {
      render(<UploadProgress {...defaultProps} status="uploading" progress={60} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '60');
    });

    it('progress bar tiene atributo aria-valuemin', () => {
      render(<UploadProgress {...defaultProps} status="uploading" progress={50} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    });

    it('progress bar tiene atributo aria-valuemax', () => {
      render(<UploadProgress {...defaultProps} status="uploading" progress={50} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('icono tiene aria-hidden="true"', () => {
      const { container } = render(<UploadProgress {...defaultProps} status="uploading" />);

      const icon = container.querySelector('span[aria-hidden="true"]');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    it('nombre de archivo tiene atributo title para truncado', () => {
      render(<UploadProgress {...defaultProps} fileName="convenio-muy-largo.pdf" />);

      const fileNameElement = screen.getByTitle('convenio-muy-largo.pdf');
      expect(fileNameElement).toBeInTheDocument();
    });

    it('botón cancelar tiene type="button"', () => {
      const onCancel = vi.fn();
      render(<UploadProgress {...defaultProps} status="uploading" onCancel={onCancel} />);

      const cancelButton = screen.getByRole('button', { name: /cancelar/i });
      expect(cancelButton).toHaveAttribute('type', 'button');
    });
  });

  describe('Estilos dinámicos', () => {
    it('barra de progreso usa el color del estado "uploading"', () => {
      render(<UploadProgress {...defaultProps} status="uploading" progress={50} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveStyle({ backgroundColor: 'var(--colorsAccentAccent9)' });
    });

    it('texto de estado usa el color correcto para cada estado', () => {
      const { rerender } = render(<UploadProgress {...defaultProps} status="uploading" />);
      let statusLabel = screen.getByText(/Subiendo\.\.\./);
      expect(statusLabel).toHaveStyle({ color: 'var(--colorsAccentAccent9)' });

      rerender(<UploadProgress {...defaultProps} status="validating" />);
      statusLabel = screen.getByText('Validando estructura...');
      expect(statusLabel).toHaveStyle({ color: 'var(--colorsSemanticInfo9)' });

      rerender(<UploadProgress {...defaultProps} status="processing" processingProgress={50} />);
      statusLabel = screen.getByText(/Procesando convenio\.\.\. 50%/);
      expect(statusLabel).toHaveStyle({ color: 'var(--colorsSemanticWarning9)' });

      rerender(<UploadProgress {...defaultProps} status="ready" />);
      statusLabel = screen.getByText('Listo para consultar');
      expect(statusLabel).toHaveStyle({ color: 'var(--colorsSemanticSuccess9)' });

      rerender(<UploadProgress {...defaultProps} status="error" />);
      statusLabel = screen.getByText('Error');
      expect(statusLabel).toHaveStyle({ color: 'var(--colorsSemanticError9)' });
    });

    it('nombre de archivo tiene clase truncate para overflow', () => {
      render(<UploadProgress {...defaultProps} fileName="archivo-muy-largo.pdf" />);

      const fileNameElement = screen.getByText('archivo-muy-largo.pdf');
      expect(fileNameElement).toHaveClass('truncate');
    });
  });

  describe('Edge cases', () => {
    it('maneja nombres de archivo muy largos', () => {
      const longFileName = 'convenio-colectivo-de-trabajo-del-sector-de-hosteleria-muy-largo.pdf';
      render(<UploadProgress {...defaultProps} fileName={longFileName} />);

      expect(screen.getByText(longFileName)).toBeInTheDocument();
      expect(screen.getByTitle(longFileName)).toBeInTheDocument();
    });

    it('maneja progreso decimal correctamente', () => {
      render(<UploadProgress {...defaultProps} status="uploading" progress={45.7} />);

      expect(screen.getByText(/46%/)).toBeInTheDocument(); // Math.round(45.7) = 46
    });

    it('maneja múltiples clics en botón cancelar', () => {
      const onCancel = vi.fn();
      render(<UploadProgress {...defaultProps} status="uploading" onCancel={onCancel} />);

      const cancelButton = screen.getByRole('button', { name: /cancelar/i });
      fireEvent.click(cancelButton);
      fireEvent.click(cancelButton);
      fireEvent.click(cancelButton);

      expect(onCancel).toHaveBeenCalledTimes(3);
    });

    it('muestra mensaje de procesamiento con tiempo estimado', () => {
      render(<UploadProgress {...defaultProps} status="processing" estimatedTimeLeft={120} />);

      expect(
        screen.getByText(/Tiempo estimado restante: ~2 min/)
      ).toBeInTheDocument();
    });

    it('formatea correctamente el tiempo restante en segundos', () => {
      render(<UploadProgress {...defaultProps} status="processing" estimatedTimeLeft={45} />);

      expect(
        screen.getByText(/~45 seg/)
      ).toBeInTheDocument();
    });

    it('muestra "Finalizando..." cuando el tiempo restante es 0', () => {
      render(<UploadProgress {...defaultProps} status="processing" estimatedTimeLeft={0} />);

      expect(
        screen.getByText(/Finalizando\.\.\./)
      ).toBeInTheDocument();
    });
  });
});
