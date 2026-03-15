import { MessageSquareIcon, PlusIcon, SettingsIcon, CrownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@ui/components/shadcn/button';
import { ScrollArea } from '@ui/components/shadcn/scroll-area';
import { Separator } from '@ui/components/shadcn/separator';
import { Logo } from '@ui/components/workrules/atoms/Logo/Logo';
import type { ConversationSummary } from '@core/types';

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
        'flex h-full w-64 flex-col border-r bg-[var(--colorsNeutralNeutral2)]',
        'border-[var(--colorsNeutralNeutral4)]',
        className
      )}
    >
      {/* Header con Logo */}
      <header className="flex items-center justify-center border-b border-[var(--colorsNeutralNeutral4)] p-4">
        <Logo size="md" />
      </header>

      {/* Botón Nueva Consulta */}
      <div className="p-4">
        <Button
          onClick={onNewConversation}
          className={cn(
            'w-full justify-start gap-2',
            'bg-[var(--colorsAccentAccent9)] text-white',
            'hover:bg-[var(--colorsAccentAccent10)]',
            'transition-colors duration-200'
          )}
        >
          <PlusIcon className="h-4 w-4" />
          <span className="font-medium">Nueva consulta</span>
        </Button>
      </div>

      <Separator className="bg-[var(--colorsNeutralNeutral4)]" />

      {/* Lista de Conversaciones */}
      <ScrollArea className="flex-1 px-2">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquareIcon
              className="mb-3 h-12 w-12 text-[var(--colorsNeutralNeutral8)]"
              aria-hidden="true"
            />
            <p className="text-sm text-[var(--colorsNeutralNeutral11)]">
              No hay conversaciones
            </p>
            <p className="mt-1 text-xs text-[var(--colorsNeutralNeutral9)]">
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
                    'hover:bg-[var(--colorsNeutralNeutral3)]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--colorsAccentAccent9)]',
                    isActive && 'bg-[var(--colorsAccentAccent3)] border-l-2 border-[var(--colorsAccentAccent9)]'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <h3
                      className={cn(
                        'flex-1 truncate text-sm font-medium',
                        isActive
                          ? 'text-[var(--colorsAccentAccent11)]'
                          : 'text-[var(--colorsNeutralNeutral12)]'
                      )}
                    >
                      {conversation.title}
                    </h3>
                    <MessageSquareIcon
                      className={cn(
                        'h-4 w-4 flex-shrink-0',
                        isActive
                          ? 'text-[var(--colorsAccentAccent9)]'
                          : 'text-[var(--colorsNeutralNeutral9)]'
                      )}
                      aria-hidden="true"
                    />
                  </div>

                  <p className="truncate text-xs text-[var(--colorsNeutralNeutral10)]">
                    {conversation.convenioNombre}
                  </p>

                  <p className="mt-1 truncate text-xs text-[var(--colorsNeutralNeutral9)]">
                    {conversation.preview}
                  </p>
                </button>
              );
            })}
          </nav>
        )}
      </ScrollArea>

      <Separator className="bg-[var(--colorsNeutralNeutral4)]" />

      {/* Footer con Plan Badge y Settings */}
      <footer className="flex items-center justify-between border-t border-[var(--colorsNeutralNeutral4)] p-4">
        <div
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium',
            userPlan === 'premium'
              ? 'bg-[var(--colorsSemanticWarning4)] text-[var(--colorsSemanticWarning11)]'
              : 'bg-[var(--colorsNeutralNeutral4)] text-[var(--colorsNeutralNeutral11)]'
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
          className={cn(
            'h-9 w-9 text-[var(--colorsNeutralNeutral11)]',
            'hover:bg-[var(--colorsNeutralNeutral3)] hover:text-[var(--colorsNeutralNeutral12)]',
            'transition-colors duration-150'
          )}
          aria-label="Abrir configuración"
        >
          <SettingsIcon className="h-5 w-5" />
        </Button>
      </footer>
    </aside>
  );
}
