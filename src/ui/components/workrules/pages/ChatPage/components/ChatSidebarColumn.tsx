import type { ConversationSummary, UserConvenio } from '@core/types';
import type { ConvenioUploaderController } from '@ui/components/workrules/organisms/ConvenioUploader';
import { Sidebar } from '@ui/components/workrules/organisms/Sidebar/Sidebar';
import { lazy, Suspense } from 'react';
import type { Convenio } from '../ChatPage.types';

const MobileDrawer = lazy(() =>
  import('@ui/components/workrules/organisms/MobileDrawer/MobileDrawer').then((m) => ({
    default: m.MobileDrawer,
  })),
);

export interface ChatSidebarColumnProps {
  isMobile: boolean;
  isTablet: boolean;
  currentConversationId: string | null;
  conversations: ConversationSummary[];
  userPlan: 'free' | 'premium';
  userConvenios: UserConvenio[];
  loadingUserConvenios: boolean;
  convenioUploaderController: ConvenioUploaderController;
  onConvenioUploaded: (convenioId: string) => void;
  onNewConversation: () => void;
  onSelectConversation: (id: string) => Promise<void> | void;
  onOpenSettings: () => void;
  selectConvenio: (convenio: Convenio) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
}

/**
 * Columna izquierda del ChatPage: navegación de conversaciones y convenios.
 * Renderiza el Sidebar en 3 variantes según viewport (desktop expandido,
 * tablet colapsado, mobile/tablet en drawer) y encapsula el cierre del drawer
 * al seleccionar conversación o convenio.
 */
export function ChatSidebarColumn({
  isMobile,
  isTablet,
  currentConversationId,
  conversations,
  userPlan,
  userConvenios,
  loadingUserConvenios,
  convenioUploaderController,
  onConvenioUploaded,
  onNewConversation,
  onSelectConversation,
  onOpenSettings,
  selectConvenio,
  isSidebarOpen,
  setIsSidebarOpen,
}: ChatSidebarColumnProps) {
  const isCompact = isMobile || isTablet;

  const handleSelectConversation = async (id: string) => {
    await onSelectConversation(id);
    if (isCompact) setIsSidebarOpen(false);
  };

  const handleSelectConvenioFromManager = (convenioId: string) => {
    const convenio = userConvenios.find((c) => c.id === convenioId);
    if (convenio) selectConvenio(convenio);
    if (isCompact) setIsSidebarOpen(false);
  };

  if (isCompact) {
    return (
      <>
        {isTablet && (
          <Sidebar
            currentConversationId={currentConversationId ?? undefined}
            conversations={conversations}
            userPlan={userPlan}
            onNewConversation={onNewConversation}
            onSelectConversation={handleSelectConversation}
            onOpenSettings={onOpenSettings}
            isCollapsed={true}
            onExpand={() => setIsSidebarOpen(true)}
            userConvenios={userConvenios}
            isLoadingConvenios={loadingUserConvenios}
            onSelectConvenioFromManager={handleSelectConvenioFromManager}
            onConvenioUploaded={onConvenioUploaded}
            convenioUploaderController={convenioUploaderController}
          />
        )}
        {/* TODO TFM.7-G: envolver con ErrorBoundary global (junto a Sentry) */}
        <Suspense fallback={null}>
          <MobileDrawer
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            side="left"
          >
            <Sidebar
              currentConversationId={currentConversationId ?? undefined}
              conversations={conversations}
              userPlan={userPlan}
              onNewConversation={onNewConversation}
              onSelectConversation={handleSelectConversation}
              onOpenSettings={onOpenSettings}
              onClose={() => setIsSidebarOpen(false)}
              inDrawer={true}
              userConvenios={userConvenios}
              isLoadingConvenios={loadingUserConvenios}
              onSelectConvenioFromManager={handleSelectConvenioFromManager}
              onConvenioUploaded={onConvenioUploaded}
              convenioUploaderController={convenioUploaderController}
            />
          </MobileDrawer>
        </Suspense>
      </>
    );
  }

  return (
    <Sidebar
      currentConversationId={currentConversationId ?? undefined}
      conversations={conversations}
      userPlan={userPlan}
      onNewConversation={onNewConversation}
      onSelectConversation={onSelectConversation}
      onOpenSettings={onOpenSettings}
      userConvenios={userConvenios}
      isLoadingConvenios={loadingUserConvenios}
      onSelectConvenioFromManager={handleSelectConvenioFromManager}
      onConvenioUploaded={onConvenioUploaded}
    />
  );
}
