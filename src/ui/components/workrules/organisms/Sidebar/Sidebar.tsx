import { cn } from '@/lib/utils';
import type { ConversationSummary } from '@core/types';
import { Button } from '@ui/components/shadcn/button';
import { ScrollArea } from '@ui/components/shadcn/scroll-area';
import { Logo } from '@ui/components/workrules/atoms/Logo/Logo';
import { ThemeToggle } from '@ui/components/workrules/atoms/ThemeToggle';
import { ConvenioUploader } from '@ui/components/workrules/organisms/ConvenioUploader';
import { CrownIcon, MessageSquareIcon, PlusIcon, XIcon } from 'lucide-react';

export interface SidebarProps {
  currentConversationId?: string;
  conversations: ConversationSummary[];
  userPlan: 'free' | 'premium';
  onNewConversation: () => void;
  onSelectConversation: (id: string) => void;
  onOpenSettings: () => void;
  onConvenioUploaded?: (convenioId: string) => void;
  isCollapsed?: boolean;
  onClose?: () => void;
  inDrawer?: boolean;
  className?: string;
}

export function Sidebar({
  currentConversationId,
  conversations,
  userPlan,
  onNewConversation,
  onSelectConversation,
  onConvenioUploaded,
  isCollapsed = false,
  onClose,
  inDrawer = false,
  className,
}: SidebarProps) {
  // Modo colapsado (tablet) - solo iconos
  if (isCollapsed) {
    return (
      <aside
        role="complementary"
        aria-label="Barra lateral de navegación"
        className={cn(
          'flex h-full w-16 flex-col items-center bg-muted/50 py-4',
          className
        )}
      >
        <Logo variant="icon" size="sm" />

        <div className="mt-4">
          <Button variant="ghost" size="icon" onClick={onNewConversation} title="Nueva consulta">
            <PlusIcon className="h-5 w-5" />
          </Button>
        </div>

        {/* Iconos de conversaciones recientes */}
        <div className="mt-4 flex flex-1 flex-col gap-2 overflow-y-auto">
          {conversations.slice(0, 5).map((conv) => (
            <Button
              key={conv.id}
              variant="ghost"
              size="icon"
              onClick={() => onSelectConversation(conv.id)}
              className={cn(conv.id === currentConversationId && 'bg-muted')}
              title={conv.title}
            >
              <MessageSquareIcon className="h-5 w-5" />
            </Button>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-auto flex flex-col items-center gap-2">
          {userPlan === 'premium' && <CrownIcon className="h-4 w-4 text-yellow-500" />}
          <ThemeToggle size="sm" />
        </div>
      </aside>
    );
  }

  // Modo expandido (normal)
  return (
    <aside
      role="complementary"
      aria-label="Barra lateral de navegación"
      className={cn(
        'flex h-full w-64 flex-col',
        inDrawer ? 'bg-card' : 'bg-muted/50',
        className
      )}
    >
      {/* Header con Logo */}
      <header className="flex items-center justify-between p-4">
        <Logo size="sm" />
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
            aria-label="Cerrar"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        )}
      </header>

      {/* Botón Nueva Consulta */}
      <div className="p-4">
        <Button
          onClick={onNewConversation}
          className="w-full justify-start gap-2"
          size="sm"
        >
          <PlusIcon className="h-4 w-4" />
          <span className="font-medium">Nueva consulta</span>
        </Button>
      </div>

      {/* Lista de Conversaciones */}
      <ScrollArea className="flex-1 px-2">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquareIcon
              className="mb-3 h-12 w-12 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-sm text-foreground">
              No hay conversaciones
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Inicia una nueva consulta
            </p>
          </div>
        ) : (
          <nav className="space-y-1 py-2" role="navigation" aria-label="Conversaciones">
            {conversations.map((conversation) => {
              const isActive = currentConversationId === conversation.id;

              return (
                <button
                  key={conversation.id}
                  onClick={() => onSelectConversation(conversation.id)}
                  className={cn(
                    'w-full rounded-md px-3 py-2.5 text-left transition-colors duration-150',
                    'hover:bg-muted',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isActive && 'border-l-2 border-primary bg-muted'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <h3
                      className={cn(
                        'flex-1 truncate text-sm font-medium',
                        isActive ? 'font-semibold text-foreground' : 'text-foreground'
                      )}
                    >
                      {conversation.title}
                    </h3>
                    <MessageSquareIcon
                      className={cn(
                        'h-4 w-4 shrink-0',
                        isActive ? 'text-primary' : 'text-muted-foreground'
                      )}
                      aria-hidden="true"
                    />
                  </div>

                  <p className="truncate text-xs text-muted-foreground">
                    {conversation.convenioNombre}
                  </p>

                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {conversation.preview}
                  </p>
                </button>
              );
            })}
          </nav>
        )}
      </ScrollArea>

      {/* Uploader de convenios (solo premium) */}
      {userPlan === 'premium' && (
        <div className="p-4">
          <ConvenioUploader
            isPremium={true}
            onConvenioReady={onConvenioUploaded}
          />
        </div>
      )}

      {/* Footer con Plan Badge y Theme Toggle */}      <footer className="flex items-center justify-between p-4">
        <div
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium',
            userPlan === 'premium'
              ? 'bg-(--colorsSemanticWarning4) text-(--colorsSemanticWarning12)'
              : 'bg-muted text-foreground'
          )}
          role="status"
          aria-label={`Plan ${userPlan === 'premium' ? 'Premium' : 'Free'}`}
        >
          {userPlan === 'premium' && <CrownIcon className="h-3.5 w-3.5" aria-hidden="true" />}
          <span className="font-semibold capitalize">{userPlan}</span>
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle size="md" />
        </div>
      </footer>
    </aside>
  );
}
