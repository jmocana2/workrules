/**
 * ChatPage - Página principal de chat para consultas de convenios colectivos
 *
 * Orquesta 3 columnas:
 * - ChatSidebarColumn (izquierda): navegación de conversaciones y convenios
 * - ChatConversationColumn (centro): hilo de mensajes + input
 * - ChatVariablesColumn (derecha): variables del convenio seleccionado
 */

import { cn } from '@/lib/utils';
import { useBreakpoint } from '@core/hooks';
import { useConvenios, useUserConvenios, useUserPlan } from '@ui/hooks';
import { openConvenioPdf as openConvenioPdfUseCase } from '@/application/use-cases';
import { useRepositories } from '@/providers/RepositoriesProvider';
import { useState } from 'react';

import type { ChatPageProps } from './ChatPage.types';
import { useChatPage } from './useChatPage';
import { canSubmit as canSubmitHelper } from './helpers/canSubmit';
import { getEmptyStateText } from './helpers/emptyState';
import { normalizeUserPlan } from './helpers/normalizeUserPlan';
import { useConvenioUploadIntegration } from './hooks/useConvenioUploadIntegration';
import { ChatSidebarColumn } from './components/ChatSidebarColumn';
import { ChatConversationColumn } from './components/ChatConversationColumn';
import { ChatVariablesColumn } from './components/ChatVariablesColumn';

export function ChatPage({
  initialConvenioId,
  initialMessages,
  mockConvenios,
  mockPerfil,
  mockConversations,
  mockUserPlan = 'premium',
  className,
}: ChatPageProps) {
  const { isMobile, isTablet } = useBreakpoint();

  const { convenio: convenioRepo } = useRepositories();
  const handleOpenConvenioPdf = (
    convenioId: string,
    options?: { page?: number | null },
  ) => void openConvenioPdfUseCase(convenioId, { repo: convenioRepo }, options);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isVariablesPanelOpen, setIsVariablesPanelOpen] = useState(false);

  const useMocks = import.meta.env.VITE_USE_MOCKS === 'true';
  const { data: realConvenios = [], isLoading: loadingConvenios } = useConvenios();
  const { data: userConvenios = [], isLoading: loadingUserConvenios } = useUserConvenios();
  const convenios = useMocks ? (mockConvenios ?? []) : realConvenios;

  const { plan: realUserPlan } = useUserPlan();
  const userPlan = useMocks ? mockUserPlan : normalizeUserPlan(realUserPlan);

  const {
    selectedConvenio,
    perfilJson,
    isVariablesPanelCollapsed,
    conversations,
    currentConversationId,
    messages,
    input,
    isLoading,
    alertState,
    dataRequestState,
    inputRef,
    messagesEndRef,
    handleInputChange,
    handleSubmitFromText,
    handleVariableClick,
    selectConvenio,
    clearConvenio,
    handleNewConversation,
    handleSelectConversation,
    handleOpenSettings,
    toggleVariablesPanel,
    handleAlertDismiss,
    handleInvalidDataSuggestion,
    handleConflictOption,
    handleSMIViewDetails,
    handleDataRequestSubmit,
    handleDataRequestSkip,
    activeVariables,
    handleVariableRemove,
    humanizeVariableLabel,
    salaryMode,
    setSalaryMode,
    hasIdentifyingVariables,
  } = useChatPage({
    initialConvenioId,
    initialMessages,
    mockConvenios,
    mockPerfil,
    mockConversations,
  });

  const emptyState = getEmptyStateText(selectedConvenio);

  const canSubmit = (text: string) =>
    canSubmitHelper({ text, selectedConvenio, salaryMode, hasIdentifyingVariables });

  const handlePromptSubmit = async (message: { text: string; files: unknown[] }) => {
    if (!canSubmit(message.text)) return;
    await handleSubmitFromText(message.text);
  };

  // El controller vive en ChatPage para que el estado del upload (y los recursos vivos
  // del hook: polling, AbortController) sobreviva al remount del Sidebar cuando cambia
  // el breakpoint mobile/tablet/desktop, p.ej. al rotar el móvil portrait↔landscape.
  const {
    controller: convenioUploaderController,
    onConvenioUploaded: handleConvenioUploaded,
  } = useConvenioUploadIntegration();

  return (
    <div
      className={cn(
        'flex h-screen h-[100dvh] w-full overflow-hidden bg-background',
        className,
      )}
    >
      <ChatSidebarColumn
        isMobile={isMobile}
        isTablet={isTablet}
        currentConversationId={currentConversationId}
        conversations={conversations}
        userPlan={userPlan}
        userConvenios={userConvenios}
        loadingUserConvenios={loadingUserConvenios}
        convenioUploaderController={convenioUploaderController}
        onConvenioUploaded={handleConvenioUploaded}
        onNewConversation={handleNewConversation}
        onSelectConversation={handleSelectConversation}
        onOpenSettings={handleOpenSettings}
        selectConvenio={selectConvenio}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      <ChatConversationColumn
        isMobile={isMobile}
        isTablet={isTablet}
        selectedConvenio={selectedConvenio}
        convenios={convenios}
        loadingConvenios={loadingConvenios}
        selectConvenio={selectConvenio}
        clearConvenio={clearConvenio}
        messages={messages}
        isLoading={isLoading}
        messagesEndRef={messagesEndRef}
        emptyState={emptyState}
        alertState={alertState}
        handleAlertDismiss={handleAlertDismiss}
        handleSMIViewDetails={handleSMIViewDetails}
        handleInvalidDataSuggestion={handleInvalidDataSuggestion}
        handleConflictOption={handleConflictOption}
        dataRequestState={dataRequestState}
        handleDataRequestSubmit={handleDataRequestSubmit}
        handleDataRequestSkip={handleDataRequestSkip}
        input={input}
        inputRef={inputRef}
        handleInputChange={handleInputChange}
        handlePromptSubmit={handlePromptSubmit}
        canSubmit={canSubmit}
        activeVariables={activeVariables}
        handleVariableRemove={handleVariableRemove}
        humanizeVariableLabel={humanizeVariableLabel}
        salaryMode={salaryMode}
        setSalaryMode={setSalaryMode}
        handleOpenConvenioPdf={handleOpenConvenioPdf}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        onOpenVariablesPanel={() => setIsVariablesPanelOpen(true)}
      />

      <ChatVariablesColumn
        isMobile={isMobile}
        isTablet={isTablet}
        perfilJson={perfilJson}
        activeVariables={activeVariables}
        onVariableClick={handleVariableClick}
        isVariablesPanelCollapsed={isVariablesPanelCollapsed}
        toggleVariablesPanel={toggleVariablesPanel}
        isVariablesPanelOpen={isVariablesPanelOpen}
        setIsVariablesPanelOpen={setIsVariablesPanelOpen}
      />
    </div>
  );
}
