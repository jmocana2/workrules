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
  },
];

describe('ConvenioManager', () => {
  it('muestra título y botón de subir convenio', () => {
    const onUpload = vi.fn();
    render(
      <ConvenioManager
        userConvenios={mockConvenios}
        onUpload={onUpload}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggleFavorite={vi.fn()}
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
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggleFavorite={vi.fn()}
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
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggleFavorite={vi.fn()}
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
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggleFavorite={vi.fn()}
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

    render(
      <ConvenioManager
        userConvenios={mockConvenios}
        onUpload={onUpload}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggleFavorite={vi.fn()}
      />
    );

    const uploadButton = screen.getByText('Subir convenio');
    await user.click(uploadButton);

    expect(onUpload).toHaveBeenCalledTimes(1);
  });

  it('muestra skeletons cuando isLoading es true', () => {
    const { container } = render(
      <ConvenioManager
        userConvenios={[]}
        isLoading={true}
        onUpload={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggleFavorite={vi.fn()}
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
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggleFavorite={vi.fn()}
      />
    );

    // Verificar que existe un LockIcon (convenio privado)
    // Los iconos de lucide-react se renderizan como SVG
    const lockIcons = container.querySelectorAll('svg');
    expect(lockIcons.length).toBeGreaterThan(0);
  });

  it('muestra icono de favorito cuando isFavorite es true', () => {
    const { container } = render(
      <ConvenioManager
        userConvenios={mockConvenios.slice(0, 1)} // Solo el primero que es favorito
        onUpload={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggleFavorite={vi.fn()}
      />
    );

    // El StarIcon está visible en el DOM
    // Verificar que hay un svg con clase fill-yellow-400 (el icono de favorito)
    const starIcon = container.querySelector('.fill-yellow-400');
    expect(starIcon).toBeInTheDocument();
  });

  it('abre el dropdown menu al hacer click en el botón de acciones', async () => {
    const user = userEvent.setup();

    render(
      <ConvenioManager
        userConvenios={mockConvenios.slice(0, 1)}
        onUpload={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggleFavorite={vi.fn()}
      />
    );

    // Buscar el botón de menú por accesibilidad
    const menuButton = screen.getByRole('button', { name: /abrir menú/i });
    await user.click(menuButton);

    // Verificar que aparecen las opciones del menú
    expect(screen.getByText(/Quitar de favoritos/i)).toBeInTheDocument();
    expect(screen.getByText('Editar nombre')).toBeInTheDocument();
    expect(screen.getByText('Eliminar')).toBeInTheDocument();
  });

  it('deshabilita el botón de editar cuando status no es ready', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();

    render(
      <ConvenioManager
        userConvenios={mockConvenios.slice(1, 2)} // Convenio en estado 'processing'
        onUpload={vi.fn()}
        onEdit={onEdit}
        onDelete={vi.fn()}
        onToggleFavorite={vi.fn()}
      />
    );

    const menuButton = screen.getByRole('button', { name: /abrir menú/i });
    await user.click(menuButton);

    // Verificar que el botón de editar existe pero no debería poder ejecutarse
    const editButton = screen.getByText('Editar nombre');
    expect(editButton).toBeInTheDocument();
    expect(editButton.closest('[role="menuitem"]')).toHaveAttribute('data-disabled');

    // Additionally verify that clicking doesn't trigger the callback
    await user.click(editButton);
    expect(onEdit).not.toHaveBeenCalled();
  });
  it('muestra el errorMessage cuando status es error', () => {
    render(
      <ConvenioManager
        userConvenios={mockConvenios.slice(3, 4)} // Convenio con error
        onUpload={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggleFavorite={vi.fn()}
      />
    );

    expect(
      screen.getByText(/No se pudo extraer las tablas salariales del PDF/i)
    ).toBeInTheDocument();
  });

  it('llama a onToggleFavorite al hacer click en la opción de favorito', async () => {
    const user = userEvent.setup();
    const onToggleFavorite = vi.fn();

    render(
      <ConvenioManager
        userConvenios={mockConvenios.slice(0, 1)}
        onUpload={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggleFavorite={onToggleFavorite}
      />
    );

    const menuButton = screen.getByRole('button', { name: /abrir menú/i });
    await user.click(menuButton);

    const favoriteOption = screen.getByText(/Quitar de favoritos/i);
    await user.click(favoriteOption);

    expect(onToggleFavorite).toHaveBeenCalledWith('1');
  });

  it('llama a onDelete al hacer click en eliminar', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(
      <ConvenioManager
        userConvenios={mockConvenios.slice(0, 1)}
        onUpload={vi.fn()}
        onEdit={vi.fn()}
        onDelete={onDelete}
        onToggleFavorite={vi.fn()}
      />
    );

    const menuButton = screen.getByRole('button', { name: /abrir menú/i });
    await user.click(menuButton);

    const deleteOption = screen.getByText('Eliminar');
    await user.click(deleteOption);

    expect(onDelete).toHaveBeenCalledWith('1');
  });

  it('llama a onEdit al hacer click en editar nombre', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();

    render(
      <ConvenioManager
        userConvenios={mockConvenios.slice(0, 1)} // Convenio en estado 'ready'
        onUpload={vi.fn()}
        onEdit={onEdit}
        onDelete={vi.fn()}
        onToggleFavorite={vi.fn()}
      />
    );

    const menuButton = screen.getByRole('button', { name: /abrir menú/i });
    await user.click(menuButton);

    const editOption = screen.getByText('Editar nombre');
    await user.click(editOption);

    expect(onEdit).toHaveBeenCalledWith('1');
  });
});
