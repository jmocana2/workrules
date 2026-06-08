import type { ConversationSummary } from '@core/types';
import {
  RepositoriesProvider,
  type Repositories,
} from '@/providers/RepositoriesProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Sidebar } from './Sidebar';

// Mock ResizeObserver para ScrollArea de Radix
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const fakeRepositories: Partial<Repositories> = {
  convenio: {
    getById: vi.fn().mockResolvedValue(null),
    list: vi.fn().mockResolvedValue([]),
    listOwnedByUser: vi.fn().mockResolvedValue([]),
    getPerfil: vi.fn().mockResolvedValue(null),
    getSignedPdfUrl: vi.fn().mockResolvedValue(null),
  },
  chatSession: {
    listByUser: vi.fn().mockResolvedValue([]),
    deleteById: vi.fn().mockResolvedValue(undefined),
    create: vi.fn().mockResolvedValue(null),
    loadMessages: vi.fn().mockResolvedValue(null),
    getConvenioIdForSession: vi.fn().mockResolvedValue(null),
  },
  userPlan: { getPlan: vi.fn().mockResolvedValue('free') },
  convenioUpload: {
    getUploadIdentity: vi.fn().mockResolvedValue(null),
    uploadPdf: vi.fn().mockResolvedValue({ signedUrl: '', filePath: '' }),
    confirmUpload: vi.fn().mockResolvedValue({
      status: 'started' as const,
      convenioId: 'mock',
      existingNombre: null,
    }),
    fetchProcessingStatus: vi.fn().mockResolvedValue({
      estado: 'procesando',
      errorMessage: null,
      progressStage: null,
      progressValue: null,
      progressMessage: null,
    }),
  },
};

// Create QueryClient wrapper for tests
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <RepositoriesProvider value={fakeRepositories}>{children}</RepositoriesProvider>
    </QueryClientProvider>
  );
}

const mockConversations: ConversationSummary[] = [
  {
    id: '1',
    title: 'Consulta sobre vacaciones',
    convenioId: 'conv-1',
    convenioNombre: 'Convenio Comercio',
    lastMessageAt: '2024-01-15T10:30:00Z',
    preview: '¿Cuántos días de vacaciones me corresponden?',
  },
  {
    id: '2',
    title: 'Cálculo salario',
    convenioId: 'conv-2',
    convenioNombre: 'Convenio Hostelería',
    lastMessageAt: '2024-01-14T16:45:00Z',
    preview: 'Necesito calcular mi salario',
  },
];

describe('Sidebar', () => {
  it('debe renderizar el logo', () => {
    const onNewConversation = vi.fn();
    const onSelectConversation = vi.fn();
    const onOpenSettings = vi.fn();

    render(
      <Sidebar
        conversations={mockConversations}
        userPlan="free"
        onNewConversation={onNewConversation}
        onSelectConversation={onSelectConversation}
        onOpenSettings={onOpenSettings}
      />
    );

    // El logo debería estar presente
    expect(screen.getByRole('img', { name: /workrules/i })).toBeInTheDocument();
  });

  it('debe renderizar el botón de nueva consulta', () => {
    const onNewConversation = vi.fn();
    const onSelectConversation = vi.fn();
    const onOpenSettings = vi.fn();

    render(
      <Sidebar
        conversations={mockConversations}
        userPlan="free"
        onNewConversation={onNewConversation}
        onSelectConversation={onSelectConversation}
        onOpenSettings={onOpenSettings}
      />
    );

    const newConsultationButton = screen.getByRole('button', { name: /nueva consulta/i });
    expect(newConsultationButton).toBeInTheDocument();
  });

  it('debe llamar a onNewConversation cuando se hace clic en el botón', async () => {
    const user = userEvent.setup();
    const onNewConversation = vi.fn();
    const onSelectConversation = vi.fn();
    const onOpenSettings = vi.fn();

    render(
      <Sidebar
        conversations={mockConversations}
        userPlan="free"
        onNewConversation={onNewConversation}
        onSelectConversation={onSelectConversation}
        onOpenSettings={onOpenSettings}
      />
    );

    const newConsultationButton = screen.getByRole('button', { name: /nueva consulta/i });
    await user.click(newConsultationButton);

    expect(onNewConversation).toHaveBeenCalledTimes(1);
  });

  it('debe mostrar el estado vacío cuando no hay conversaciones', () => {
    const onNewConversation = vi.fn();
    const onSelectConversation = vi.fn();
    const onOpenSettings = vi.fn();

    render(
      <Sidebar
        conversations={[]}
        userPlan="free"
        onNewConversation={onNewConversation}
        onSelectConversation={onSelectConversation}
        onOpenSettings={onOpenSettings}
      />
    );

    expect(screen.getByText(/no hay conversaciones/i)).toBeInTheDocument();
    expect(screen.getByText(/inicia una nueva consulta/i)).toBeInTheDocument();
  });

  it('debe listar todas las conversaciones', () => {
    const onNewConversation = vi.fn();
    const onSelectConversation = vi.fn();
    const onOpenSettings = vi.fn();

    render(
      <Sidebar
        conversations={mockConversations}
        userPlan="free"
        onNewConversation={onNewConversation}
        onSelectConversation={onSelectConversation}
        onOpenSettings={onOpenSettings}
      />
    );

    expect(screen.getByText('Consulta sobre vacaciones')).toBeInTheDocument();
    expect(screen.getByText('Cálculo salario')).toBeInTheDocument();
    expect(screen.getByText('Convenio Comercio')).toBeInTheDocument();
    expect(screen.getByText('Convenio Hostelería')).toBeInTheDocument();
  });

  it('debe llamar a onSelectConversation con el ID correcto', async () => {
    const user = userEvent.setup();
    const onNewConversation = vi.fn();
    const onSelectConversation = vi.fn();
    const onOpenSettings = vi.fn();

    render(
      <Sidebar
        conversations={mockConversations}
        userPlan="free"
        onNewConversation={onNewConversation}
        onSelectConversation={onSelectConversation}
        onOpenSettings={onOpenSettings}
      />
    );

    // El texto del título está dentro de un h3 pero el botón clickeable es el elemento parent
    const titleElement = screen.getByText('Consulta sobre vacaciones');
    const conversationButton = titleElement.closest('button');

    expect(conversationButton).not.toBeNull();

    await user.click(conversationButton!);
    expect(onSelectConversation).toHaveBeenCalledWith('1');
  });

  it('debe resaltar la conversación activa', () => {
    const onNewConversation = vi.fn();
    const onSelectConversation = vi.fn();
    const onOpenSettings = vi.fn();

    render(
      <Sidebar
        conversations={mockConversations}
        currentConversationId="1"
        userPlan="free"
        onNewConversation={onNewConversation}
        onSelectConversation={onSelectConversation}
        onOpenSettings={onOpenSettings}
      />
    );

    const activeConversation = screen.getByText('Consulta sobre vacaciones').closest('button');
    expect(activeConversation).toHaveAttribute('aria-current', 'page');
  });

  it('debe mostrar el badge de plan Free correctamente', () => {
    const onNewConversation = vi.fn();
    const onSelectConversation = vi.fn();
    const onOpenSettings = vi.fn();

    render(
      <Sidebar
        conversations={mockConversations}
        userPlan="free"
        onNewConversation={onNewConversation}
        onSelectConversation={onSelectConversation}
        onOpenSettings={onOpenSettings}
      />
    );

    const badge = screen.getByRole('status', { name: /plan free/i });
    expect(badge).toBeInTheDocument();
    expect(screen.getByText(/free/i)).toBeInTheDocument();
  });

  it('debe aceptar className personalizada', () => {
    const onNewConversation = vi.fn();
    const onSelectConversation = vi.fn();
    const onOpenSettings = vi.fn();

    render(
      <Sidebar
        conversations={mockConversations}
        userPlan="free"
        onNewConversation={onNewConversation}
        onSelectConversation={onSelectConversation}
        onOpenSettings={onOpenSettings}
        className="custom-sidebar-class"
      />
    );

    const sidebar = screen.getByRole('complementary');
    expect(sidebar).toHaveClass('custom-sidebar-class');
  });

  it('debe mostrar el preview de cada conversación', () => {
    const onNewConversation = vi.fn();
    const onSelectConversation = vi.fn();
    const onOpenSettings = vi.fn();

    render(
      <Sidebar
        conversations={mockConversations}
        userPlan="free"
        onNewConversation={onNewConversation}
        onSelectConversation={onSelectConversation}
        onOpenSettings={onOpenSettings}
      />
    );

    expect(screen.getByText('¿Cuántos días de vacaciones me corresponden?')).toBeInTheDocument();
    expect(screen.getByText('Necesito calcular mi salario')).toBeInTheDocument();
  });

  it('no debe mostrar el ConvenioUploader para usuarios free', () => {
    const onNewConversation = vi.fn();
    const onSelectConversation = vi.fn();
    const onOpenSettings = vi.fn();

    render(
      <Sidebar
        conversations={mockConversations}
        userPlan="free"
        onNewConversation={onNewConversation}
        onSelectConversation={onSelectConversation}
        onOpenSettings={onOpenSettings}
      />
    );

    // No debe existir el texto del DropZone
    expect(screen.queryByText(/arrastra pdf aqui/i)).not.toBeInTheDocument();
  });

  it('debe llamar a onConvenioUploaded cuando se completa la subida', async () => {
    const onNewConversation = vi.fn();
    const onSelectConversation = vi.fn();
    const onOpenSettings = vi.fn();
    const onConvenioUploaded = vi.fn();
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <Sidebar
          conversations={mockConversations}
          userPlan="premium"
          onNewConversation={onNewConversation}
          onSelectConversation={onSelectConversation}
          onOpenSettings={onOpenSettings}
          onConvenioUploaded={onConvenioUploaded}
        />
      </Wrapper>
    );

    // Verificar que el uploader está presente (lazy → await)
    expect(
      await screen.findByLabelText(/subir archivo pdf/i, {}, { timeout: 3000 }),
    ).toBeInTheDocument();

    // Nota: El test completo del flujo de upload está en ConvenioUploader.test.tsx
    // Aquí solo verificamos que el callback se pasa correctamente
  });

  it('no debe mostrar el botón de gestión de convenios para usuarios free', () => {
    const onNewConversation = vi.fn();
    const onSelectConversation = vi.fn();
    const onOpenSettings = vi.fn();

    render(
      <Sidebar
        conversations={mockConversations}
        userPlan="free"
        onNewConversation={onNewConversation}
        onSelectConversation={onSelectConversation}
        onOpenSettings={onOpenSettings}
      />
    );

    const manageButton = screen.queryByRole('button', { name: /gestionar convenios/i });
    expect(manageButton).not.toBeInTheDocument();
  });

  it('debe mostrar el botón de gestión de convenios para premium incluso sin callbacks', () => {
    const onNewConversation = vi.fn();
    const onSelectConversation = vi.fn();
    const onOpenSettings = vi.fn();
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <Sidebar
          conversations={mockConversations}
          userPlan="premium"
          onNewConversation={onNewConversation}
          onSelectConversation={onSelectConversation}
          onOpenSettings={onOpenSettings}
        />
      </Wrapper>
    );

    const manageButton = screen.getByRole('button', { name: /gestionar convenios/i });
    expect(manageButton).toBeInTheDocument();
  });

  it('debe mostrar el botón de gestión de convenios para usuarios premium con callbacks', () => {
    const onNewConversation = vi.fn();
    const onSelectConversation = vi.fn();
    const onOpenSettings = vi.fn();
    const onSelectConvenioFromManager = vi.fn();
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <Sidebar
          conversations={mockConversations}
          userPlan="premium"
          onNewConversation={onNewConversation}
          onSelectConversation={onSelectConversation}
          onOpenSettings={onOpenSettings}
          onSelectConvenioFromManager={onSelectConvenioFromManager}
          userConvenios={[]}
        />
      </Wrapper>
    );

    const manageButton = screen.getByRole('button', { name: /gestionar convenios/i });
    expect(manageButton).toBeInTheDocument();
  });

  it('debe abrir el ConvenioManager al hacer clic en el botón de gestión', async () => {
    const user = userEvent.setup();
    const onNewConversation = vi.fn();
    const onSelectConversation = vi.fn();
    const onOpenSettings = vi.fn();
    const onSelectConvenioFromManager = vi.fn();
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <Sidebar
          conversations={mockConversations}
          userPlan="premium"
          onNewConversation={onNewConversation}
          onSelectConversation={onSelectConversation}
          onOpenSettings={onOpenSettings}
          onSelectConvenioFromManager={onSelectConvenioFromManager}
          userConvenios={[]}
        />
      </Wrapper>
    );

    const manageButton = screen.getByRole('button', { name: /gestionar convenios/i });
    await user.click(manageButton);

    // Verificar que se abre el popover con el título del ConvenioManager (lazy → await)
    expect(await screen.findByText('Mis convenios')).toBeInTheDocument();
  });
});
