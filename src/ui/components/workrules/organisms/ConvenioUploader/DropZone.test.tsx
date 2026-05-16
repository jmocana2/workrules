import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DropZone } from './DropZone';

// Helper: construye un File con cabecera %PDF- válida para pasar validatePdfFileAsync.
function makePdfFile(name: string, extraBytes = 0): File {
  const header = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const padding = extraBytes > 0 ? 'a'.repeat(extraBytes) : '';
  return new File([header + padding], name, { type: 'application/pdf' });
}

describe('DropZone', () => {
  const mockOnFileSelect = vi.fn();

  beforeEach(() => {
    mockOnFileSelect.mockClear();
  });

  it('renders correctly', () => {
    render(<DropZone onFileSelect={mockOnFileSelect} />);

    expect(screen.getByText(/Arrastra PDF aqui/i)).toBeInTheDocument();
    expect(screen.getByText(/o haz click para seleccionar/i)).toBeInTheDocument();
  });

  it('accepts valid PDF files', async () => {
    render(<DropZone onFileSelect={mockOnFileSelect} />);

    const file = makePdfFile('test.pdf');
    const dropZone = screen.getByText(/Arrastra PDF aqui/i).parentElement;

    fireEvent.drop(dropZone!, {
      dataTransfer: { files: [file] },
    });

    await waitFor(() => {
      expect(mockOnFileSelect).toHaveBeenCalledWith(file);
    });
  });

  it('rejects non-PDF files', async () => {
    render(<DropZone onFileSelect={mockOnFileSelect} />);

    const file = new File(['dummy content'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const dropZone = screen.getByText(/Arrastra PDF aqui/i).parentElement;

    fireEvent.drop(dropZone!, {
      dataTransfer: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByText(/Solo se permiten archivos PDF/i)).toBeInTheDocument();
    });
    expect(mockOnFileSelect).not.toHaveBeenCalled();
  });

  it('rejects files larger than max size', async () => {
    render(<DropZone onFileSelect={mockOnFileSelect} maxSizeMB={1} />);

    // Archivo con cabecera PDF válida pero >1MB (~1.5MB)
    const file = makePdfFile('test.pdf', 1024 * 1024 * 1.5);

    const dropZone = screen.getByText(/Arrastra PDF aqui/i).parentElement;

    fireEvent.drop(dropZone!, {
      dataTransfer: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByText(/El archivo excede el límite/i)).toBeInTheDocument();
    });
    expect(mockOnFileSelect).not.toHaveBeenCalled();
  });

  it('does not accept files when disabled', () => {
    render(<DropZone onFileSelect={mockOnFileSelect} disabled />);

    const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
    const dropZone = screen.getByText(/Arrastra PDF aqui/i).parentElement;

    fireEvent.drop(dropZone!, {
      dataTransfer: { files: [file] },
    });

    expect(mockOnFileSelect).not.toHaveBeenCalled();
  });

  it('highlights on drag over', () => {
    render(<DropZone onFileSelect={mockOnFileSelect} />);

    const dropZone = screen.getByText(/Arrastra PDF aqui/i).parentElement;

    fireEvent.dragOver(dropZone!, {
      dataTransfer: { files: [] },
    });

    expect(dropZone).toHaveClass('border-[var(--colorsAccentAccent9)]');
    expect(dropZone).toHaveClass('bg-[var(--tokensColorsAccentSurface)]');
  });

  it('removes highlight on drag leave', () => {
    render(<DropZone onFileSelect={mockOnFileSelect} />);

    const dropZone = screen.getByText(/Arrastra PDF aqui/i).parentElement;

    fireEvent.dragOver(dropZone!, {
      dataTransfer: { files: [] },
    });

    fireEvent.dragLeave(dropZone!);

    expect(dropZone).not.toHaveClass('border-[var(--colorsAccentAccent9)]');
    expect(dropZone).not.toHaveClass('bg-[var(--tokensColorsAccentSurface)]');
  });
});
