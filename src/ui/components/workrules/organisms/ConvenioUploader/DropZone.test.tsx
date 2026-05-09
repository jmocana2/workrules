import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DropZone } from './DropZone';

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

  it('accepts valid PDF files', () => {
    render(<DropZone onFileSelect={mockOnFileSelect} />);

    const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
    const dropZone = screen.getByText(/Arrastra PDF aqui/i).parentElement;

    fireEvent.drop(dropZone!, {
      dataTransfer: { files: [file] },
    });

    expect(mockOnFileSelect).toHaveBeenCalledWith(file);
  });

  it('rejects non-PDF files', () => {
    render(<DropZone onFileSelect={mockOnFileSelect} />);

    const file = new File(['dummy content'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const dropZone = screen.getByText(/Arrastra PDF aqui/i).parentElement;

    fireEvent.drop(dropZone!, {
      dataTransfer: { files: [file] },
    });

    expect(mockOnFileSelect).not.toHaveBeenCalled();
    expect(screen.getByText(/Solo se permiten archivos PDF/i)).toBeInTheDocument();
  });

  it('rejects files larger than max size', () => {
    render(<DropZone onFileSelect={mockOnFileSelect} maxSizeMB={1} />);

    // Create a file larger than 1MB (1024 * 1024 * 1.5 = 1.5MB)
    const largeContent = new Array(1024 * 1024 * 1.5).join('a');
    const file = new File([largeContent], 'test.pdf', { type: 'application/pdf' });

    const dropZone = screen.getByText(/Arrastra PDF aqui/i).parentElement;

    fireEvent.drop(dropZone!, {
      dataTransfer: { files: [file] },
    });

    expect(mockOnFileSelect).not.toHaveBeenCalled();
    expect(screen.getByText(/El archivo excede el límite/i)).toBeInTheDocument();
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
