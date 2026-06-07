import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConvenioSelector } from './ConvenioSelector';
import type { Convenio } from '@core/types';

const mockConvenios: Convenio[] = [
  {
    id: '1',
    nombre: 'Convenio Estatal de Comercio',
    ambito: 'estatal',
    codigo_regcon: 'BOE-A-2023-12345',
    url_pdf: 'https://boe.es/diario_boe/txt.php?id=BOE-A-2023-12345',
    estado: 'activo',
    visibilidad: 'publico',
    created_at: '2023-01-15T10:00:00Z',
    updated_at: '2023-01-15T10:00:00Z',
  },
  {
    id: '2',
    nombre: 'Convenio Provincial de Construcción (Madrid)',
    ambito: 'provincial',
    codigo_regcon: 'BOE-A-2023-23456',
    url_pdf: 'https://boe.es/diario_boe/txt.php?id=BOE-A-2023-23456',
    estado: 'activo',
    visibilidad: 'publico',
    created_at: '2023-02-20T10:00:00Z',
    updated_at: '2023-02-20T10:00:00Z',
  },
  {
    id: '3',
    nombre: 'Convenio de Empresa - Telefónica España',
    ambito: 'empresa',
    codigo_regcon: 'BOE-A-2023-34567',
    url_pdf: 'https://boe.es/diario_boe/txt.php?id=BOE-A-2023-34567',
    estado: 'activo',
    visibilidad: 'publico',
    created_at: '2023-03-10T10:00:00Z',
    updated_at: '2023-03-10T10:00:00Z',
  },
];

describe('ConvenioSelector', () => {
  it('muestra el placeholder cuando no hay selección', () => {
    render(
      <ConvenioSelector
        convenios={mockConvenios}
        onSelect={vi.fn()}
        onClear={vi.fn()}
        placeholder="Seleccionar convenio"
      />
    );

    expect(screen.getByRole('combobox')).toHaveTextContent(
      'Seleccionar convenio'
    );
  });

  it('muestra skeleton cuando isLoading es true', () => {
    const { container } = render(
      <ConvenioSelector
        convenios={mockConvenios}
        onSelect={vi.fn()}
        onClear={vi.fn()}
        isLoading
      />
    );

    // Verifica que el skeleton está presente
    const skeleton = container.querySelector('[data-slot="skeleton"]');
    expect(skeleton).toBeInTheDocument();

    // Verifica que el combobox NO está visible
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('muestra el convenio seleccionado en el botón', () => {
    render(
      <ConvenioSelector
        selectedConvenio={mockConvenios[0]}
        convenios={mockConvenios}
        onSelect={vi.fn()}
        onClear={vi.fn()}
      />
    );

    expect(screen.getByRole('combobox')).toHaveTextContent(
      'Convenio Estatal de Comercio'
    );
  });

  it('muestra el chip removible cuando hay convenio seleccionado', () => {
    render(
      <ConvenioSelector
        selectedConvenio={mockConvenios[0]}
        convenios={mockConvenios}
        onSelect={vi.fn()}
        onClear={vi.fn()}
      />
    );

    // El nombre del convenio aparece tanto en el botón como en el chip
    const elements = screen.getAllByText('Convenio Estatal de Comercio');
    expect(elements.length).toBeGreaterThan(0);

    // Debe tener botón de eliminar
    expect(
      screen.getByRole('button', {
        name: /eliminar convenio estatal de comercio/i,
      })
    ).toBeInTheDocument();
  });

  it('abre el dropdown al hacer clic en el botón', async () => {
    const user = userEvent.setup();

    render(
      <ConvenioSelector
        convenios={mockConvenios}
        onSelect={vi.fn()}
        onClear={vi.fn()}
      />
    );

    const button = screen.getByRole('combobox');
    await user.click(button);

    // Verifica que el listado se muestra
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Buscar convenio')).toBeInTheDocument();
    });

    // Verifica que todos los convenios están visibles
    expect(screen.getByText('Convenio Estatal de Comercio')).toBeInTheDocument();
    expect(
      screen.getByText('Convenio Provincial de Construcción (Madrid)')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Convenio de Empresa - Telefónica España')
    ).toBeInTheDocument();
  });

  it('filtra convenios por búsqueda fuzzy', async () => {
    const user = userEvent.setup();

    render(
      <ConvenioSelector
        convenios={mockConvenios}
        onSelect={vi.fn()}
        onClear={vi.fn()}
      />
    );

    // Abrir dropdown
    await user.click(screen.getByRole('combobox'));

    // Esperar a que aparezca el input de búsqueda
    const searchInput = await screen.findByPlaceholderText('Buscar convenio');

    // Buscar "comercio" debería encontrar solo "Convenio Estatal de Comercio"
    await user.type(searchInput, 'comercio');

    await waitFor(() => {
      expect(screen.getByText('Convenio Estatal de Comercio')).toBeInTheDocument();
    });

    // Los otros no deberían estar visibles
    expect(
      screen.queryByText('Convenio Provincial de Construcción (Madrid)')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Convenio de Empresa - Telefónica España')
    ).not.toBeInTheDocument();
  });

  it('filtra convenios normalizando acentos', async () => {
    const conveniosConAcentos: Convenio[] = [
      {
        id: '1',
        nombre: 'Convenio de Educación',
        ambito: 'estatal',
        codigo_regcon: 'BOE-A-2023-11111',
        estado: 'activo',
        visibilidad: 'publico',
        created_at: '2023-01-15T10:00:00Z',
        updated_at: '2023-01-15T10:00:00Z',
      },
    ];

    const user = userEvent.setup();

    render(
      <ConvenioSelector
        convenios={conveniosConAcentos}
        onSelect={vi.fn()}
        onClear={vi.fn()}
      />
    );

    await user.click(screen.getByRole('combobox'));
    const searchInput = await screen.findByPlaceholderText('Buscar convenio');

    // Buscar sin acentos debería encontrar el convenio con acentos
    await user.type(searchInput, 'educacion');

    await waitFor(() => {
      expect(screen.getByText('Convenio de Educación')).toBeInTheDocument();
    });
  });

  it('llama a onSelect cuando se selecciona un convenio', async () => {
    const handleSelect = vi.fn();
    const user = userEvent.setup();

    render(
      <ConvenioSelector
        convenios={mockConvenios}
        onSelect={handleSelect}
        onClear={vi.fn()}
      />
    );

    // Abrir dropdown
    await user.click(screen.getByRole('combobox'));

    // Seleccionar un convenio
    const option = await screen.findByText('Convenio Estatal de Comercio');
    await user.click(option);

    expect(handleSelect).toHaveBeenCalledWith(mockConvenios[0]);
  });

  it('llama a onClear cuando se elimina el chip', async () => {
    const handleClear = vi.fn();
    const user = userEvent.setup();

    render(
      <ConvenioSelector
        selectedConvenio={mockConvenios[0]}
        convenios={mockConvenios}
        onSelect={vi.fn()}
        onClear={handleClear}
      />
    );

    // Hacer clic en el botón de eliminar del chip
    const removeButton = screen.getByRole('button', {
      name: /eliminar convenio estatal de comercio/i,
    });
    await user.click(removeButton);

    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it('muestra badges de ámbito con colores correctos', async () => {
    const user = userEvent.setup();

    render(
      <ConvenioSelector
        convenios={mockConvenios}
        onSelect={vi.fn()}
        onClear={vi.fn()}
      />
    );

    await user.click(screen.getByRole('combobox'));

    // Verificar que los badges están presentes
    await waitFor(() => {
      expect(screen.getByText('Estatal')).toBeInTheDocument();
      expect(screen.getByText('Provincial')).toBeInTheDocument();
      expect(screen.getByText('Empresa')).toBeInTheDocument();
    });
  });

  it('muestra mensaje cuando no hay resultados', async () => {
    const user = userEvent.setup();

    render(
      <ConvenioSelector
        convenios={mockConvenios}
        onSelect={vi.fn()}
        onClear={vi.fn()}
      />
    );

    await user.click(screen.getByRole('combobox'));
    const searchInput = await screen.findByPlaceholderText('Buscar convenio');

    // Buscar algo que no existe
    await user.type(searchInput, 'xyz123');

    await waitFor(() => {
      expect(screen.getByText('No se encontraron convenios.')).toBeInTheDocument();
    });
  });

  it('cierra el dropdown después de seleccionar', async () => {
    const user = userEvent.setup();

    render(
      <ConvenioSelector
        convenios={mockConvenios}
        onSelect={vi.fn()}
        onClear={vi.fn()}
      />
    );

    // Abrir dropdown
    await user.click(screen.getByRole('combobox'));

    // Verificar que está abierto
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Buscar convenio')).toBeInTheDocument();
    });

    // Seleccionar un convenio
    const option = await screen.findByText('Convenio Estatal de Comercio');
    await user.click(option);

    // Verificar que se cerró (el input de búsqueda ya no está)
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Buscar convenio')).not.toBeInTheDocument();
    });
  });

  it('limpia la búsqueda al cerrar el dropdown', async () => {
    const user = userEvent.setup();

    render(
      <ConvenioSelector
        convenios={mockConvenios}
        onSelect={vi.fn()}
        onClear={vi.fn()}
      />
    );

    // Abrir y buscar
    await user.click(screen.getByRole('combobox'));
    const searchInput = await screen.findByPlaceholderText('Buscar convenio');
    await user.type(searchInput, 'comercio');

    // Cerrar presionando Escape
    await user.keyboard('{Escape}');

    // Volver a abrir
    await user.click(screen.getByRole('combobox'));

    // Verificar que el input está vacío
    const newSearchInput = await screen.findByPlaceholderText(
      'Buscar convenio'
    );
    expect(newSearchInput).toHaveValue('');
  });
});
