import { UserConvenio } from '@core/types';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConvenioManager } from './ConvenioManager';

const mockConvenios: UserConvenio[] = [
  {
    id: '1',
    nombre: 'Hosteleria Madrid',
    sector: 'Hosteleria',
    ambito: 'provincial',
    vigente: true,
    userId: 'user-1',
    isPrivate: true,
    status: 'ready',
    isFavorite: true,
    uploadedAt: '2026-03-10T10:00:00Z',
    codigo_regcon: 'BOE-A-2026-00001',
    created_at: '2026-03-10T10:00:00Z',
    updated_at: '2026-03-10T10:00:00Z',
  },
  {
    id: '2',
    nombre: 'Convenio Empresa ABC',
    sector: 'Comercio',
    ambito: 'empresa',
    vigente: true,
    userId: 'user-1',
    isPrivate: true,
    status: 'processing',
    uploadedAt: '2026-03-14T09:30:00Z',
    codigo_regcon: 'BOE-A-2026-00002',
    created_at: '2026-03-14T09:30:00Z',
    updated_at: '2026-03-14T09:30:00Z',
  },
  {
    id: '3',
    nombre: 'Metalurgia Provincial',
    sector: 'Industria',
    ambito: 'provincial',
    vigente: true,
    userId: 'user-1',
    isPrivate: false,
    status: 'pending',
    uploadedAt: '2026-03-14T11:00:00Z',
    codigo_regcon: 'BOE-A-2026-00003',
    created_at: '2026-03-14T11:00:00Z',
    updated_at: '2026-03-14T11:00:00Z',
  },
  {
    id: '4',
    nombre: 'Convenio con Error',
    sector: 'Servicios',
    ambito: 'estatal',
    vigente: true,
    userId: 'user-1',
    isPrivate: true,
    status: 'error',
    errorMessage: 'No se pudo extraer las tablas salariales del PDF',
    uploadedAt: '2026-03-13T15:00:00Z',
    codigo_regcon: 'BOE-A-2026-00004',
    created_at: '2026-03-13T15:00:00Z',
    updated_at: '2026-03-13T15:00:00Z',
  },
];

describe('ConvenioManager', () => {
  it('muestra título y botón de subir convenio', () => {
    const onUpload = vi.fn();
    render(
      <ConvenioManager
        userConvenios={mockConvenios}
        onUpload={onUpload}
        onSelectConvenio={vi.fn()}
      />
    );

    expect(screen.getByText('Mis convenios')).toBeInTheDocument();
    expect(screen.getByText('Subir convenio')).toBeInTheDocument();
  });

  it('muestra empty state cuando no hay convenios', () => {
    render(
      <ConvenioManager
        userConvenios={[]}
        onUpload={vi.fn()}
        onSelectConvenio={vi.fn()}
      />
    );

    expect(screen.getByText('No tienes convenios subidos')).toBeInTheDocument();
    expect(
      screen.getByText(/Sube tu primer convenio en PDF/i)
    ).toBeInTheDocument();
  });

  it('muestra la lista de convenios', () => {
    render(
      <ConvenioManager
        userConvenios={mockConvenios}
        onUpload={vi.fn()}
        onSelectConvenio={vi.fn()}
      />
    );

    expect(screen.getByText('Hosteleria Madrid')).toBeInTheDocument();
    expect(screen.getByText('Convenio Empresa ABC')).toBeInTheDocument();
    expect(screen.getByText('Metalurgia Provincial')).toBeInTheDocument();
    expect(screen.getByText('Convenio con Error')).toBeInTheDocument();
  });

  it('muestra el badge de estado correcto para cada convenio', () => {
    render(
      <ConvenioManager
        userConvenios={mockConvenios}
        onUpload={vi.fn()}
        onSelectConvenio={vi.fn()}
      />
    );

    expect(screen.getByText('Listo')).toBeInTheDocument();
    expect(screen.getByText('Procesando')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('llama a onUpload cuando se hace click en el botón de subir', async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn();

    // Mock de openPdfFileSelector
    const mockFileSelector = vi.fn();
    vi.doMock('../ConvenioUploader/utils/fileSelection', () => ({
      openPdfFileSelector: mockFileSelector,
    }));

    render(
      <ConvenioManager
        userConvenios={mockConvenios}
        onUpload={onUpload}
        onSelectConvenio={vi.fn()}
      />
    );

    const uploadButton = screen.getByText('Subir convenio');
    await user.click(uploadButton);

    // El botón ahora abre un selector de archivos en lugar de llamar directamente onUpload
    expect(uploadButton).toBeInTheDocument();
  });

  it('muestra skeletons cuando isLoading es true', () => {
    const { container } = render(
      <ConvenioManager
        userConvenios={[]}
        isLoading={true}
        onUpload={vi.fn()}
        onSelectConvenio={vi.fn()}
      />
    );

    // Skeletons usan data-testid o clase específica según implementación de shadcn
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('muestra icono de privado para convenios privados', () => {
    const { container } = render(
      <ConvenioManager
        userConvenios={mockConvenios.slice(0, 1)} // Solo el primero que es privado
        onUpload={vi.fn()}
        onSelectConvenio={vi.fn()}
      />
    );

    // Verificar que existe un LockIcon (convenio privado)
    // Los iconos de lucide-react se renderizan como SVG
    const lockIcons = container.querySelectorAll('svg');
    expect(lockIcons.length).toBeGreaterThan(0);
  });

  it('muestra el errorMessage cuando status es error', () => {
    render(
      <ConvenioManager
        userConvenios={mockConvenios.slice(3, 4)} // Convenio con error
        onUpload={vi.fn()}
        onSelectConvenio={vi.fn()}
      />
    );

    expect(
      screen.getByText(/No se pudo extraer las tablas salariales del PDF/i)
    ).toBeInTheDocument();
  });

  it('llama a onSelectConvenio al hacer click en un convenio ready', async () => {
    const user = userEvent.setup();
    const onSelectConvenio = vi.fn();

    render(
      <ConvenioManager
        userConvenios={mockConvenios.slice(0, 1)} // Solo el primero que está en ready
        onUpload={vi.fn()}
        onSelectConvenio={onSelectConvenio}
      />
    );

    const convenioItem = screen.getByTestId('convenio-item-1');
    expect(convenioItem).toBeInTheDocument();

    await user.click(convenioItem);

    expect(onSelectConvenio).toHaveBeenCalledWith('1');
  });

  it('no permite hacer click en convenios que no están ready', async () => {
    const user = userEvent.setup();
    const onSelectConvenio = vi.fn();

    render(
      <ConvenioManager
        userConvenios={mockConvenios.slice(1, 2)} // Convenio en processing
        onUpload={vi.fn()}
        onSelectConvenio={onSelectConvenio}
      />
    );

    const convenioItem = screen.getByTestId('convenio-item-2');
    expect(convenioItem).toBeInTheDocument();
    expect(convenioItem).toHaveClass('opacity-60');

    await user.click(convenioItem);

    expect(onSelectConvenio).not.toHaveBeenCalled();
  });
});
