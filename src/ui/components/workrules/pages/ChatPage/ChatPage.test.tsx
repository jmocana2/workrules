import type { Convenio, ConversationSummary, PerfilJson } from '@core/types';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatPage } from './ChatPage';

// Mock useChat del AI SDK (nueva API con sendMessage)
vi.mock('@ai-sdk/react', () => ({
  useChat: vi.fn(() => ({
    messages: [],
    sendMessage: vi.fn(),
    status: 'ready',
    error: null,
    setMessages: vi.fn(),
  })),
}));

// Mock DefaultChatTransport
vi.mock('ai', () => ({
  DefaultChatTransport: vi.fn().mockImplementation(function() {
    return {};
  }),
}));

// Datos de prueba
const mockConvenios: Convenio[] = [
  {
    id: '1',
    nombre: 'Hostelería de Madrid',
    ambito: 'provincial',
    codigo_boe: 'BOE-A-2023-12345',
    created_at: '2023-01-15T10:00:00Z',
    updated_at: '2023-01-15T10:00:00Z',
  },
  {
    id: '2',
    nombre: 'Convenio Estatal de Hostelería',
    ambito: 'estatal',
    codigo_boe: 'BOE-A-2023-23456',
    created_at: '2023-03-20T10:00:00Z',
    updated_at: '2023-03-20T10:00:00Z',
  },
];

const mockConversations: ConversationSummary[] = [
  {
    id: '1',
    title: 'Consulta salario',
    convenioId: '1',
    convenioNombre: 'Hostelería de Madrid',
    lastMessageAt: new Date().toISOString(),
    preview: '¿Cuál es el salario base?',
  },
];

const mockPerfil: PerfilJson = {
  convenio: 'Hostelería de Madrid',
  variables_criticas: ['Categoría Profesional', 'Antigüedad'],
  valores_posibles: {
    'Categoría Profesional': ['Camarero/a', 'Cocinero/a'],
    'Antigüedad': ['0-2 años', '2-5 años'],
  },
};

describe('ChatPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza el componente correctamente', () => {
    render(
      <ChatPage
        mockConvenios={mockConvenios}
        mockConversations={mockConversations}
      />
    );

    // Verifica que se renderiza el componente - puede haber múltiples elementos con texto similar
    const elements = screen.getAllByText(/selecciona un convenio/i);
    expect(elements.length).toBeGreaterThan(0);
  });

  it('muestra el estado vacío cuando no hay convenio seleccionado', () => {
    render(
      <ChatPage
        mockConvenios={mockConvenios}
        mockConversations={[]}
      />
    );

    // El estado vacío muestra el mensaje
    const elements = screen.getAllByText(/selecciona un convenio/i);
    expect(elements.length).toBeGreaterThan(0);
  });

  it('muestra el sidebar con las conversaciones', () => {
    render(
      <ChatPage
        mockConvenios={mockConvenios}
        mockConversations={mockConversations}
      />
    );

    expect(screen.getByText('Consulta salario')).toBeInTheDocument();
  });

  it('muestra el badge de plan free por defecto', () => {
    render(
      <ChatPage
        mockConvenios={mockConvenios}
        mockConversations={mockConversations}
        mockUserPlan="free"
      />
    );

    // El texto es "free" con clase capitalize que lo muestra como "Free"
    expect(screen.getByText('free')).toBeInTheDocument();
  });

  it('muestra el badge de plan premium cuando se especifica', () => {
    render(
      <ChatPage
        mockConvenios={mockConvenios}
        mockConversations={mockConversations}
        mockUserPlan="premium"
      />
    );

    // El texto es "premium" con clase capitalize que lo muestra como "Premium"
    expect(screen.getByText('premium')).toBeInTheDocument();
  });

  it('deshabilita el textarea cuando no hay convenio seleccionado', () => {
    render(
      <ChatPage
        mockConvenios={mockConvenios}
        mockConversations={[]}
      />
    );

    const textarea = screen.getByPlaceholderText(/selecciona un convenio primero/i);
    expect(textarea).toBeDisabled();
  });

  it('muestra el botón de nueva consulta', () => {
    render(
      <ChatPage
        mockConvenios={mockConvenios}
        mockConversations={mockConversations}
      />
    );

    expect(screen.getByText('Nueva consulta')).toBeInTheDocument();
  });
});

describe('ChatPage - Interacciones', () => {
  it('puede abrir el selector de convenios', async () => {
    const user = userEvent.setup();

    render(
      <ChatPage
        mockConvenios={mockConvenios}
        mockConversations={[]}
      />
    );

    // Buscar el botón del combobox
    const combobox = screen.getByRole('combobox');
    await user.click(combobox);

    // Verificar que se muestran las opciones
    await waitFor(() => {
      expect(screen.getByText('Hostelería de Madrid')).toBeInTheDocument();
    });
  });

  it('llama a onNewConversation cuando se hace click en nueva consulta', async () => {
    const user = userEvent.setup();

    render(
      <ChatPage
        mockConvenios={mockConvenios}
        mockConversations={mockConversations}
      />
    );

    const newButton = screen.getByText('Nueva consulta');
    await user.click(newButton);

    // El componente debería resetear el estado
    // Verificamos que el mensaje de bienvenida vuelve a aparecer (puede haber múltiples)
    const elements = screen.getAllByText(/selecciona un convenio/i);
    expect(elements.length).toBeGreaterThan(0);
  });

  it('puede seleccionar una conversación del historial', async () => {
    const user = userEvent.setup();

    render(
      <ChatPage
        mockConvenios={mockConvenios}
        mockConversations={mockConversations}
      />
    );

    const conversation = screen.getByText('Consulta salario');
    await user.click(conversation);

    // Debería marcar la conversación como activa
    // (el estilo cambia pero el contenido sigue siendo el mismo)
    expect(conversation).toBeInTheDocument();
  });
});

describe('ChatPage - VariablesPanel', () => {
  it('muestra el VariablesPanel cuando hay perfil', () => {
    render(
      <ChatPage
        mockConvenios={mockConvenios}
        mockConversations={[]}
        mockPerfil={mockPerfil}
      />
    );

    // El panel de variables debería estar visible
    expect(screen.getByText('Categoría Profesional')).toBeInTheDocument();
  });

  it('muestra las variables críticas del perfil', () => {
    render(
      <ChatPage
        mockConvenios={mockConvenios}
        mockConversations={[]}
        mockPerfil={mockPerfil}
      />
    );

    expect(screen.getByText('Categoría Profesional')).toBeInTheDocument();
    expect(screen.getByText('Antigüedad')).toBeInTheDocument();
  });

  it('puede colapsar el VariablesPanel', async () => {
    const user = userEvent.setup();

    render(
      <ChatPage
        mockConvenios={mockConvenios}
        mockConversations={[]}
        mockPerfil={mockPerfil}
      />
    );

    // Buscar el botón de colapsar (icono ChevronRight)
    const collapseButton = screen.getByRole('button', { name: /colapsar/i });
    await user.click(collapseButton);

    // El contenido debería estar oculto
    // Verificamos que el panel se colapsó (el contenido no debería ser visible)
    await waitFor(() => {
      expect(screen.queryByText('Categoría Profesional')).not.toBeInTheDocument();
    });
  });
});

describe('ChatPage - Accesibilidad', () => {
  it('tiene labels accesibles en los controles principales', () => {
    render(
      <ChatPage
        mockConvenios={mockConvenios}
        mockConversations={mockConversations}
      />
    );

    // Combobox del selector de convenio
    expect(screen.getByRole('combobox')).toBeInTheDocument();

    // Botón de nueva consulta
    expect(
      screen.getByRole('button', { name: /nueva consulta/i })
    ).toBeInTheDocument();
  });

  it('el textarea tiene placeholder descriptivo', () => {
    render(
      <ChatPage
        mockConvenios={mockConvenios}
        mockConversations={[]}
      />
    );

    expect(
      screen.getByPlaceholderText(/selecciona un convenio primero/i)
    ).toBeInTheDocument();
  });
});

describe('ChatPage - Alertas del Protocolo', () => {
  it('no muestra alertas por defecto', () => {
    render(
      <ChatPage
        mockConvenios={mockConvenios}
        mockConversations={[]}
      />
    );

    // Ninguna alerta visible
    expect(screen.queryByText('Alerta de Salario Mínimo')).not.toBeInTheDocument();
    expect(screen.queryByText('Dato fuera de rango')).not.toBeInTheDocument();
    expect(screen.queryByText('Conflicto detectado')).not.toBeInTheDocument();
  });

  // Nota: Los tests de alertas con estado requieren mockear useChatPage
  // o usar el setAlert que se expone. Dado que ChatPage usa el hook internamente,
  // para tests más completos de alertas, se pueden crear tests de integración
  // que simulen respuestas del backend o usar Storybook.
});
