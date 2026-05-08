import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConvenioPreview } from '../ConvenioPreview';

describe('ConvenioPreview', () => {
  const mockData = {
    nombre: 'Convenio Colectivo de Hostelería',
    ambito: 'provincial',
    paginas: 127,
    vigencia: '2023-2026',
  };

  const mockHandlers = {
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza correctamente con todos los datos', () => {
    render(<ConvenioPreview data={mockData} {...mockHandlers} />);

    expect(screen.getByText('Preview del convenio')).toBeInTheDocument();
    expect(screen.getByText('Convenio Colectivo de Hostelería')).toBeInTheDocument();
    expect(screen.getByText('provincial')).toBeInTheDocument();
    expect(screen.getByText('127')).toBeInTheDocument();
    expect(screen.getByText('2023-2026')).toBeInTheDocument();
  });

  it('renderiza solo el nombre cuando no hay datos opcionales', () => {
    const minimalData = { nombre: 'Convenio Básico' };
    render(<ConvenioPreview data={minimalData} {...mockHandlers} />);

    expect(screen.getByText('Convenio Básico')).toBeInTheDocument();
    expect(screen.queryByText(/ambito/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/paginas/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/vigencia/i)).not.toBeInTheDocument();
  });

  it('muestra labels para todos los campos presentes', () => {
    render(<ConvenioPreview data={mockData} {...mockHandlers} />);

    expect(screen.getByText('Nombre:')).toBeInTheDocument();
    expect(screen.getByText('Ambito:')).toBeInTheDocument();
    expect(screen.getByText('Paginas:')).toBeInTheDocument();
    expect(screen.getByText('Vigencia:')).toBeInTheDocument();
  });

  it('aplica capitalize al ambito', () => {
    render(<ConvenioPreview data={mockData} {...mockHandlers} />);

    const ambitoElement = screen.getByText('provincial');
    expect(ambitoElement).toHaveClass('capitalize');
  });

  it('llama a onConfirm al hacer click en Confirmar', async () => {
    const user = userEvent.setup();
    render(<ConvenioPreview data={mockData} {...mockHandlers} />);

    const confirmButton = screen.getByRole('button', { name: /confirmar/i });
    await user.click(confirmButton);

    expect(mockHandlers.onConfirm).toHaveBeenCalledTimes(1);
    expect(mockHandlers.onCancel).not.toHaveBeenCalled();
  });

  it('llama a onCancel al hacer click en Cancelar', async () => {
    const user = userEvent.setup();
    render(<ConvenioPreview data={mockData} {...mockHandlers} />);

    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    await user.click(cancelButton);

    expect(mockHandlers.onCancel).toHaveBeenCalledTimes(1);
    expect(mockHandlers.onConfirm).not.toHaveBeenCalled();
  });

  it('muestra "Procesando..." cuando isLoading es true', () => {
    render(<ConvenioPreview data={mockData} {...mockHandlers} isLoading={true} />);

    expect(screen.getByText('Procesando...')).toBeInTheDocument();
    expect(screen.queryByText('Confirmar')).not.toBeInTheDocument();
  });

  it('deshabilita ambos botones cuando isLoading es true', () => {
    render(<ConvenioPreview data={mockData} {...mockHandlers} isLoading={true} />);

    const confirmButton = screen.getByRole('button', { name: /procesando/i });
    const cancelButton = screen.getByRole('button', { name: /cancelar/i });

    expect(confirmButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('no deshabilita botones cuando isLoading es false', () => {
    render(<ConvenioPreview data={mockData} {...mockHandlers} isLoading={false} />);

    const confirmButton = screen.getByRole('button', { name: /confirmar/i });
    const cancelButton = screen.getByRole('button', { name: /cancelar/i });

    expect(confirmButton).not.toBeDisabled();
    expect(cancelButton).not.toBeDisabled();
  });

  it('no permite clicks en botones cuando están deshabilitados', async () => {
    const user = userEvent.setup();
    render(<ConvenioPreview data={mockData} {...mockHandlers} isLoading={true} />);

    const confirmButton = screen.getByRole('button', { name: /procesando/i });
    const cancelButton = screen.getByRole('button', { name: /cancelar/i });

    await user.click(confirmButton);
    await user.click(cancelButton);

    expect(mockHandlers.onConfirm).not.toHaveBeenCalled();
    expect(mockHandlers.onCancel).not.toHaveBeenCalled();
  });

  it('renderiza datos opcionales solo cuando existen', () => {
    const partialData = {
      nombre: 'Convenio Parcial',
      ambito: 'nacional',
      // Sin paginas ni vigencia
    };
    render(<ConvenioPreview data={partialData} {...mockHandlers} />);

    expect(screen.getByText('Convenio Parcial')).toBeInTheDocument();
    expect(screen.getByText('nacional')).toBeInTheDocument();
    expect(screen.queryByText('Paginas:')).not.toBeInTheDocument();
    expect(screen.queryByText('Vigencia:')).not.toBeInTheDocument();
  });
});
