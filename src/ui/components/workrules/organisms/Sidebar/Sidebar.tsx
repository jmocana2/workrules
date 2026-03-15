import { cn } from '@/lib/utils';
import type { ConversationSummary } from '@core/types';
import { Button } from '@ui/components/shadcn/button';
import { ScrollArea } from '@ui/components/shadcn/scroll-area';
import { Separator } from '@ui/components/shadcn/separator';
import { Logo } from '@ui/components/workrules/atoms/Logo/Logo';
import { CrownIcon, MessageSquareIcon, PlusIcon, SettingsIcon } from 'lucide-react';

export interface SidebarProps {
  currentConversationId?: string;
  conversations: ConversationSummary[];
  userPlan: 'free' | 'premium';
  onNewConversation: () => void;
  onSelectConversation: (id: string) => void;
  onOpenSettings: () => void;
  className?: string;
}

export function Sidebar({
  currentConversationId,
  conversations,
  userPlan,
  onNewConversation,
  onSelectConversation,
  onOpenSettings,
  className,
}: SidebarProps) {
  return (
    <aside
      role="complementary"
      aria-label="Barra lateral de navegación"
      className={cn(
        'flex h-full w-64 flex-col border-r border-border bg-card',
        className
      )}
    >
      {/* Header con Logo */}
      <header className="flex items-center justify-center border-b border-border p-4">
        <Logo size="md" />
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

      <Separator className="bg-border" />

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

      <Separator className="bg-border" />

      {/* Footer con Plan Badge y Settings */}
      <footer className="flex items-center justify-between border-t border-border p-4">
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

        <Button
          onClick={onOpenSettings}
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          aria-label="Abrir configuración"
        >
          <SettingsIcon className="h-5 w-5" />
        </Button>
      </footer>
    </aside>
  );
}
