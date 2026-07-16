/**
 * ChatPage - Página principal de chat para consultas de convenios colectivos
 *
 * Layout de 3 columnas:
 * - Sidebar (izquierda): Navegación de conversaciones
 * - Chat (centro): Área de mensajes + input
 * - VariablesPanel (derecha): Variables del convenio seleccionado
 *
 * Integra:
 * - Vercel AI SDK (useChat) para streaming
 * - AI Elements (Message, PromptInput, Sources)
 * - Componentes WorkRules (Sidebar, ConvenioSelector, VariablesPanel)
 */

import { cn } from '@/lib/utils';
import { CHAT_TEXTS } from '@constants/texts';
import { useBreakpoint } from '@core/hooks';
import { useQueryClient } from '@tanstack/react-query';
import {
  Message,
  MessageContent,
} from '@ui/components/ai-elements/message';
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@ui/components/ai-elements/prompt-input';
import { Button } from '@ui/components/shadcn/button';
import { ScrollArea } from '@ui/components/shadcn/scroll-area';
import { Separator } from '@ui/components/shadcn/separator';
import { Logo } from '@ui/components/workrules/atoms/Logo/Logo';
import { SalaryModeToggle } from '@ui/components/workrules/atoms/SalaryModeToggle';
import { AlertConflict } from '@ui/components/workrules/molecules/AlertConflict/AlertConflict';
import { AlertInvalidData } from '@ui/components/workrules/molecules/AlertInvalidData/AlertInvalidData';
import { AlertSMI } from '@ui/components/workrules/molecules/AlertSMI/AlertSMI';
import { DataRequestCard } from '@ui/components/workrules/molecules/DataRequestCard/DataRequestCard';
import { UserMessage } from '@ui/components/workrules/molecules/UserMessage/UserMessage';
import { VariableChips, type VariableChip } from '@ui/components/workrules/molecules/VariableChips/VariableChips';
import { ConvenioSelector } from '@ui/components/workrules/organisms/ConvenioSelector/ConvenioSelector';
import { Sidebar } from '@ui/components/workrules/organisms/Sidebar/Sidebar';
import { useConvenioUploaderController } from '@ui/components/workrules/organisms/ConvenioUploader';
import { useConvenios, useUserConvenios, useUserPlan } from '@ui/hooks';
import { openConvenioPdf as openConvenioPdfUseCase } from '@/application/use-cases';
import { useRepositories } from '@/providers/RepositoriesProvider';
import { Loader2Icon, MenuIcon, SlidersIcon } from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';

const MessageResponse = lazy(() =>
  import('@ui/components/ai-elements/message-response').then((m) => ({
    default: m.MessageResponse,
  }))
);
const VariablesPanel = lazy(() =>
  import('@ui/components/workrules/organisms/VariablesPanel/VariablesPanel').then((m) => ({
    default: m.VariablesPanel,
  }))
);
const MobileDrawer = lazy(() =>
  import('@ui/components/workrules/organisms/MobileDrawer/MobileDrawer').then((m) => ({
    default: m.MobileDrawer,
  }))
);
import type {
  AlertConflictPayload,
  AlertInvalidDataPayload,
  AlertSMIPayload,
  ChatPageProps,
} from './ChatPage.types';
import { useChatPage } from './useChatPage';
import { MessageCitations } from './components/MessageCitations';
import { canSubmit as canSubmitHelper } from './helpers/canSubmit';
import { getEmptyStateText } from './helpers/emptyState';
import { normalizeUserPlan } from './helpers/normalizeUserPlan';

export function ChatPage({
  initialConvenioId,
  initialMessages,
  mockConvenios,
  mockPerfil,
  mockConversations,
  mockUserPlan = 'premium',
  className,
}: ChatPageProps) {
  // Detectar viewport
  const { isMobile, isTablet } = useBreakpoint();

  const queryClient = useQueryClient();
  const { convenio: convenioRepo } = useRepositories();
  const handleOpenConvenioPdf = (
    convenioId: string,
    options?: { page?: number | null },
  ) => void openConvenioPdfUseCase(convenioId, { repo: convenioRepo }, options);

  // Estado para mobile drawers
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isVariablesPanelOpen, setIsVariablesPanelOpen] = useState(false);

  // Medir altura real del input fijo en móvil para evitar que tape el final del chat
  const [mobileInputEl, setMobileInputEl] = useState<HTMLDivElement | null>(null);
  const [mobileInputHeight, setMobileInputHeight] = useState(0);

  useEffect(() => {
    if (!mobileInputEl || !isMobile) {
      setMobileInputHeight(0);
      return;
    }
    setMobileInputHeight(mobileInputEl.getBoundingClientRect().height);
    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height ?? 0;
      setMobileInputHeight(height);
    });
    observer.observe(mobileInputEl);
    return () => observer.disconnect();
  }, [isMobile, mobileInputEl]);

  // Usar convenios reales de Supabase (o mocks en Storybook)
  const useMocks = import.meta.env.VITE_USE_MOCKS === 'true';
  const { data: realConvenios = [], isLoading: loadingConvenios } = useConvenios();
  const { data: userConvenios = [], isLoading: loadingUserConvenios } = useUserConvenios();
  const convenios = useMocks ? (mockConvenios ?? []) : realConvenios;

  // Plan del usuario (real desde user_profiles, o mock en Storybook)
  const { plan: realUserPlan } = useUserPlan();
  const userPlan = useMocks ? mockUserPlan : normalizeUserPlan(realUserPlan);

  const {
    // Estado
    selectedConvenio,
    perfilJson,
    isVariablesPanelCollapsed,
    conversations,
    currentConversationId,
    messages,
    input,
    isLoading,

    // Estado de alertas
    alertState,

    // Estado de data request
    dataRequestState,

    // Refs
    inputRef,
    messagesEndRef,

    // Handlers
    handleInputChange,
    handleSubmitFromText,
    handleVariableClick,
    selectConvenio,
    clearConvenio,
    handleNewConversation,
    handleSelectConversation,
    handleOpenSettings,
    toggleVariablesPanel,

    // Handlers de alertas
    handleAlertDismiss,
    handleInvalidDataSuggestion,
    handleConflictOption,
    handleSMIViewDetails,

    // Handlers de data request
    handleDataRequestSubmit,
    handleDataRequestSkip,

    // Variables estructuradas (chips)
    activeVariables,
    handleVariableRemove,
    humanizeVariableLabel,

    // Modo calculo salarial
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

  // Handler para seleccionar conversación y cerrar drawer en móvil
  const handleSelectConversationAndClosDrawer = async (id: string) => {
    await handleSelectConversation(id);
    if (isMobile || isTablet) {
      setIsSidebarOpen(false);
    }
  };

  const handleConvenioUploaded = (_convenioId: string) => {
    queryClient.invalidateQueries({ queryKey: ['user-convenios'] });
  };

  // El controller vive en ChatPage para que el estado del upload (y los recursos vivos
  // del hook: polling, AbortController) sobreviva al remount del Sidebar cuando cambia
  // el breakpoint mobile/tablet/desktop, p.ej. al rotar el móvil portrait↔landscape.
  const convenioUploaderController = useConvenioUploaderController({
    onConvenioReady: handleConvenioUploaded,
  });

  // Handler para seleccionar convenio desde el ConvenioManager
  const handleSelectConvenioFromManager = (convenioId: string) => {
    // Buscar el convenio completo en los userConvenios
    const convenio = userConvenios.find(c => c.id === convenioId);
    if (convenio) {
      selectConvenio(convenio);
    }
    // Cerrar drawer en mobile/tablet si está abierto
    if (isMobile || isTablet) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div
      className={cn(
        'flex h-screen h-[100dvh] w-full overflow-hidden bg-background',
        className
      )}
    >
      {/* Sidebar - Izquierda */}
      {isMobile || isTablet ? (
        <>
          {/* Sidebar colapsada visible en tablet */}
          {isTablet && (
            <Sidebar
              currentConversationId={currentConversationId ?? undefined}
              conversations={conversations}
              userPlan={userPlan}
              onNewConversation={handleNewConversation}
              onSelectConversation={handleSelectConversationAndClosDrawer}
              onOpenSettings={handleOpenSettings}
              isCollapsed={true}
              onExpand={() => setIsSidebarOpen(true)}
              userConvenios={userConvenios}
              isLoadingConvenios={loadingUserConvenios}
              onSelectConvenioFromManager={handleSelectConvenioFromManager}
              onConvenioUploaded={handleConvenioUploaded}
              convenioUploaderController={convenioUploaderController}
            />
          )}
          {/* Drawer para expandir */}
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
              onNewConversation={handleNewConversation}
              onSelectConversation={handleSelectConversationAndClosDrawer}
              onOpenSettings={handleOpenSettings}
              onClose={() => setIsSidebarOpen(false)}
              inDrawer={true}
              userConvenios={userConvenios}
              isLoadingConvenios={loadingUserConvenios}
              onSelectConvenioFromManager={handleSelectConvenioFromManager}
              onConvenioUploaded={handleConvenioUploaded}
              convenioUploaderController={convenioUploaderController}
            />
          </MobileDrawer>
          </Suspense>
        </>
      ) : (
        <Sidebar
          currentConversationId={currentConversationId ?? undefined}
          conversations={conversations}
          userPlan={userPlan}
          onNewConversation={handleNewConversation}
          onSelectConversation={handleSelectConversation}
          onOpenSettings={handleOpenSettings}
          userConvenios={userConvenios}
          isLoadingConvenios={loadingUserConvenios}
          onSelectConvenioFromManager={handleSelectConvenioFromManager}
          onConvenioUploaded={handleConvenioUploaded}
        />
      )}

      {/* Área de Chat - Centro */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Header sticky */}
        {selectedConvenio ? (
          <header className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/60">
            <div className="flex h-16 items-start gap-2 px-3 py-3 md:gap-4 md:px-6">
              {/* Hamburger menu - Mobile y Tablet */}
              {(isMobile || isTablet) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSidebarOpen(true)}
                  aria-label="Abrir menú"
                  className="shrink-0"
                >
                  <MenuIcon className="h-5 w-5" />
                </Button>
              )}

              <ConvenioSelector
                selectedConvenio={selectedConvenio}
                convenios={convenios}
                isLoading={loadingConvenios}
                onSelect={selectConvenio}
                onClear={clearConvenio}
                placeholder={CHAT_TEXTS.convenioSelector.placeholder}
                className="min-w-0 flex-1"
              />

              {/* Botón Variables Panel - Mobile y Tablet */}
              {(isMobile || isTablet) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsVariablesPanelOpen(true)}
                  aria-label="Ver variables"
                  className="shrink-0"
                >
                  <SlidersIcon className="h-5 w-5" />
                </Button>
              )}
            </div>
          </header>
        ) : (
          isMobile && (
            <header className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/60">
              <div className="flex h-16 items-center justify-between gap-2 px-3 md:gap-4 md:px-6">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSidebarOpen(true)}
                  aria-label="Abrir menú"
                >
                  <MenuIcon className="h-5 w-5" />
                </Button>
                <Logo variant="full" size="md" />
                <div className="w-10" /> {/* Spacer para centrar el logo */}
              </div>
            </header>
          )
        )}

        {/* Área de mensajes */}
        <ScrollArea
          className={cn(
            "flex-1 overflow-hidden py-4",
            "px-4 md:px-6"
          )}
        >
          <div
            className="mx-auto max-w-3xl space-y-6"
            style={isMobile && mobileInputHeight > 0 ? { paddingBottom: mobileInputHeight + 16 } : undefined}
          >
            {messages.length === 0 ? (
              // Estado vacío
              <div className="flex flex-col items-center justify-center py-12 md:py-20 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <svg
                    className="h-8 w-8 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </div>
                <h2 className="mb-2 text-lg font-semibold text-foreground">
                  {emptyState.title}
                </h2>
                <p className="mb-6 max-w-md text-sm text-muted-foreground">
                  {emptyState.description}
                </p>

                {/* Selector de convenios si no hay ninguno seleccionado */}
                {!selectedConvenio && (
                  <div className="w-full max-w-md px-4">
                    <ConvenioSelector
                      selectedConvenio={selectedConvenio}
                      convenios={convenios}
                      isLoading={loadingConvenios}
                      onSelect={selectConvenio}
                      onClear={clearConvenio}
                      placeholder={CHAT_TEXTS.convenioSelector.placeholder}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            ) : (
              // Lista de mensajes
              <>
                {messages.map((message) =>
                  message.role === 'user' ? (
                    <UserMessage key={message.id} content={message.content} />
                  ) : (
                    <Message key={message.id} from={message.role}>
                      <MessageContent>
                        {/* TODO TFM.7-G: envolver con ErrorBoundary global (junto a Sentry) */}
                        <Suspense fallback={<span className="text-sm opacity-60">{message.content}</span>}>
                          <MessageResponse>{message.content}</MessageResponse>
                        </Suspense>
                        {message.citations && message.citations.length > 0 && (
                          <MessageCitations
                            citations={message.citations}
                            convenioId={selectedConvenio?.id}
                            onOpenPdf={handleOpenConvenioPdf}
                            hidePerCitationLinks={isMobile || isTablet}
                          />
                        )}
                      </MessageContent>
                    </Message>
                  )
                )}


              </>
            )}

            {/* Alertas del protocolo (Estados D, E, F) */}
            {alertState.isVisible && alertState.type === 'smi' && alertState.payload && (
              <AlertSMI
                calculatedAmount={(alertState.payload as AlertSMIPayload).calculatedAmount}
                smiAmount={(alertState.payload as AlertSMIPayload).smiAmount}
                adjustedAmount={(alertState.payload as AlertSMIPayload).adjustedAmount}
                payPeriod={(alertState.payload as AlertSMIPayload).payPeriod}
                year={(alertState.payload as AlertSMIPayload).year}
                onViewDetails={handleSMIViewDetails}
                onDismiss={handleAlertDismiss}
              />
            )}

            {alertState.isVisible && alertState.type === 'invalid_data' && alertState.payload && (
              <AlertInvalidData
                reason={{
                  field: (alertState.payload as AlertInvalidDataPayload).field,
                  value: (alertState.payload as AlertInvalidDataPayload).value,
                  limit: (alertState.payload as AlertInvalidDataPayload).limit,
                  legalReference: (alertState.payload as AlertInvalidDataPayload).legalReference,
                }}
                suggestions={(alertState.payload as AlertInvalidDataPayload).suggestions}
                onSelectSuggestion={handleInvalidDataSuggestion}
                onDismiss={handleAlertDismiss}
              />
            )}

            {alertState.isVisible && alertState.type === 'conflict' && alertState.payload && (
              <AlertConflict
                conflict={{
                  field1: (alertState.payload as AlertConflictPayload).field1,
                  field2: (alertState.payload as AlertConflictPayload).field2,
                  explanation: (alertState.payload as AlertConflictPayload).explanation,
                }}
                options={(alertState.payload as AlertConflictPayload).options}
                onSelectOption={handleConflictOption}
                onDismiss={handleAlertDismiss}
              />
            )}

            {/* DataRequestCard (Estado B - Datos incompletos) */}
            {dataRequestState.isVisible && dataRequestState.payload && (
              <DataRequestCard
                title={dataRequestState.payload.title}
                convenioName={dataRequestState.payload.convenioName}
                fields={dataRequestState.payload.fields}
                maxAttempts={dataRequestState.payload.maxAttempts}
                currentAttempt={dataRequestState.payload.currentAttempt}
                onSubmit={handleDataRequestSubmit}
                onSkip={handleDataRequestSkip}
              />
            )}

            {/* Indicador de "escribiendo..." */}
            {isLoading && (
              <Message from="assistant">
                <MessageContent>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2Icon className="h-4 w-4 animate-spin" />
                    <span className="text-sm">{CHAT_TEXTS.loading.typing}</span>
                  </div>
                </MessageContent>
              </Message>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {!isMobile && <Separator />}

        {/* Input de chat - Fixed en mobile, estático en desktop */}
        <div
          ref={setMobileInputEl}
          className={cn(
            "bg-card",
            isMobile && "fixed bottom-0 left-0 right-0 z-20 border-t border-border",
            isMobile ? "px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3" : "px-6 py-4"
          )}
        >
          <div className="mx-auto max-w-3xl">
            <VariableChips
              chips={Object.entries(activeVariables).map(([name, value]): VariableChip => ({
                name,
                label: humanizeVariableLabel(name),
                value,
              }))}
              onRemove={handleVariableRemove}
            />
            <PromptInput
              onSubmit={handlePromptSubmit}
              className="w-full"
            >
              <PromptInputTextarea
                ref={inputRef}
                placeholder={
                  selectedConvenio
                    ? CHAT_TEXTS.input.placeholder
                    : CHAT_TEXTS.input.placeholderNoConvenio
                }
                disabled={!selectedConvenio}
                value={input}
                onChange={handleInputChange}
                className="min-h-15 resize-none text-[var(--tokensColorsText)] placeholder:text-[var(--colorsNeutralNeutral9)]"
              />
              <PromptInputFooter>
                <SalaryModeToggle
                  active={salaryMode}
                  onToggle={setSalaryMode}
                  disabled={!selectedConvenio || isLoading}
                />
                <div className="flex-1" />
                <PromptInputSubmit
                  disabled={isLoading || !canSubmit(input)}
                  status={isLoading ? 'streaming' : undefined}
                />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </div>
      </main>

      {/* VariablesPanel - Derecha */}
      {/* TODO TFM.7-G: envolver con ErrorBoundary global (junto a Sentry) */}
      <Suspense fallback={null}>
      {isMobile || isTablet ? (
        <>
          {/* Panel colapsado visible en tablet */}
          {isTablet && (
            <VariablesPanel
              perfilJson={perfilJson}
              onVariableClick={handleVariableClick}
              activeVariables={activeVariables}
              isCollapsed={true}
              onToggleCollapse={() => setIsVariablesPanelOpen(true)}
              isMobile={false}
            />
          )}
          {/* Drawer para expandir */}
          <MobileDrawer
            isOpen={isVariablesPanelOpen}
            onClose={() => setIsVariablesPanelOpen(false)}
            side="right"
          >
            <VariablesPanel
              perfilJson={perfilJson}
              onVariableClick={handleVariableClick}
              activeVariables={activeVariables}
              isCollapsed={false}
              onToggleCollapse={() => setIsVariablesPanelOpen(false)}
              isMobile={true}
              inDrawer={true}
            />
          </MobileDrawer>
        </>
      ) : (
        <VariablesPanel
          perfilJson={perfilJson}
          onVariableClick={handleVariableClick}
          activeVariables={activeVariables}
          isCollapsed={isVariablesPanelCollapsed}
          onToggleCollapse={toggleVariablesPanel}
          isMobile={false}
        />
      )}
      </Suspense>
    </div>
  );
}
