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
import { useBreakpoint } from '@core/hooks';
import { CHAT_TEXTS } from '@constants/texts';
import { MOCK_CONVENIOS, MOCK_CONVERSATIONS } from '@mocks/data/convenios';
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@ui/components/ai-elements/message';
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@ui/components/ai-elements/prompt-input';
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '@ui/components/ai-elements/sources';
import { Button } from '@ui/components/shadcn/button';
import { ScrollArea } from '@ui/components/shadcn/scroll-area';
import { Separator } from '@ui/components/shadcn/separator';
import { Logo } from '@ui/components/workrules/atoms/Logo/Logo';
import { AlertConflict } from '@ui/components/workrules/molecules/AlertConflict/AlertConflict';
import { AlertInvalidData } from '@ui/components/workrules/molecules/AlertInvalidData/AlertInvalidData';
import { AlertSMI } from '@ui/components/workrules/molecules/AlertSMI/AlertSMI';
import { DataRequestCard } from '@ui/components/workrules/molecules/DataRequestCard/DataRequestCard';
import { ConvenioSelector } from '@ui/components/workrules/organisms/ConvenioSelector/ConvenioSelector';
import { MobileDrawer } from '@ui/components/workrules/organisms/MobileDrawer/MobileDrawer';
import { Sidebar } from '@ui/components/workrules/organisms/Sidebar/Sidebar';
import { VariablesPanel } from '@ui/components/workrules/organisms/VariablesPanel/VariablesPanel';
import { useConvenios } from '@ui/hooks';
import { Loader2Icon, MenuIcon, SlidersIcon } from 'lucide-react';
import { useState } from 'react';
import type {
  AlertConflictPayload,
  AlertInvalidDataPayload,
  AlertSMIPayload,
  ChatPageProps,
} from './ChatPage.types';
import { useChatPage } from './useChatPage';

export function ChatPage({
  initialConvenioId,
  initialMessages,
  mockConvenios = MOCK_CONVENIOS,
  mockPerfil,
  mockConversations = MOCK_CONVERSATIONS,
  mockUserPlan = 'premium',
  className,
}: ChatPageProps) {
  // Detectar viewport
  const { isMobile, isTablet } = useBreakpoint();

  // Estado para mobile drawers
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isVariablesPanelOpen, setIsVariablesPanelOpen] = useState(false);

  // Usar convenios reales de Supabase (o mocks en Storybook)
  const useMocks = import.meta.env.VITE_USE_MOCKS === 'true';
  const { data: realConvenios = [], isLoading: loadingConvenios } = useConvenios();
  const convenios = useMocks ? mockConvenios : realConvenios;

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
    citations,

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
  } = useChatPage({
    initialConvenioId,
    initialMessages,
    mockConvenios,
    mockPerfil,
    mockConversations,
  });

  // Obtener texto del estado vacío
  const getEmptyStateText = () => {
    if (selectedConvenio) {
      return {
        title: CHAT_TEXTS.empty.withConvenio.title.replace(
          '{convenio}',
          selectedConvenio.nombre
        ),
        description: CHAT_TEXTS.empty.withConvenio.description,
      };
    }
    return CHAT_TEXTS.empty.noConvenio;
  };

  const emptyState = getEmptyStateText();

  // Handler para el submit del PromptInput
  const handlePromptSubmit = async (message: { text: string; files: unknown[] }) => {
    if (!message.text.trim() || !selectedConvenio) return;
    await handleSubmitFromText(message.text);
  };

  // Handler para seleccionar conversación y cerrar drawer en móvil
  const handleSelectConversationAndClosDrawer = async (id: string) => {
    await handleSelectConversation(id);
    if (isMobile || isTablet) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div
      className={cn(
        'flex h-screen w-full overflow-hidden bg-background',
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
              userPlan={mockUserPlan}
              onNewConversation={handleNewConversation}
              onSelectConversation={handleSelectConversationAndClosDrawer}
              onOpenSettings={handleOpenSettings}
              isCollapsed={true}
            />
          )}
          {/* Drawer para expandir */}
          <MobileDrawer
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            side="left"
          >
            <Sidebar
              currentConversationId={currentConversationId ?? undefined}
              conversations={conversations}
              userPlan={mockUserPlan}
              onNewConversation={handleNewConversation}
              onSelectConversation={handleSelectConversationAndClosDrawer}
              onOpenSettings={handleOpenSettings}
              onClose={() => setIsSidebarOpen(false)}
              inDrawer={true}
            />
          </MobileDrawer>
        </>
      ) : (
        <Sidebar
          currentConversationId={currentConversationId ?? undefined}
          conversations={conversations}
          userPlan={mockUserPlan}
          onNewConversation={handleNewConversation}
          onSelectConversation={handleSelectConversation}
          onOpenSettings={handleOpenSettings}
        />
      )}

      {/* Área de Chat - Centro */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Header sticky */}
        {selectedConvenio ? (
          <header className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
            <div className="flex h-16 items-center gap-2 px-3 py-3 md:gap-4 md:px-6">
              {/* Hamburger menu - Mobile y Tablet */}
              {(isMobile || isTablet) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSidebarOpen(true)}
                  aria-label="Abrir menú"
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
                className="flex-1"
              />

              {/* Botón Variables Panel - Mobile y Tablet */}
              {(isMobile || isTablet) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsVariablesPanelOpen(true)}
                  aria-label="Ver variables"
                >
                  <SlidersIcon className="h-5 w-5" />
                </Button>
              )}
            </div>
          </header>
        ) : (
          (isMobile || isTablet) && (
            <header className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
              <div className="flex h-16 items-center justify-between gap-2 px-3 md:gap-4 md:px-6">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSidebarOpen(true)}
                  aria-label="Abrir menú"
                >
                  <MenuIcon className="h-5 w-5" />
                </Button>
                <Logo variant="full" size="sm" />
                <div className="w-10" /> {/* Spacer para centrar el logo */}
              </div>
            </header>
          )
        )}

        {/* Área de mensajes */}
        <ScrollArea className={cn(
          "flex-1 overflow-hidden py-4",
          "px-4 md:px-6",
          isMobile && "pb-32" // Espacio para input fixed en mobile
        )}>
          <div className="mx-auto max-w-3xl space-y-6">
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
                {messages.map((message) => (
                  <Message key={message.id} from={message.role}>
                    <MessageContent>
                      {message.role === 'user' ? (
                        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                      ) : (
                        <>
                          <MessageResponse>{message.content}</MessageResponse>
                          {/* Citaciones del mensaje individual */}
                          {message.citations && message.citations.length > 0 && (
                            <Sources>
                              <SourcesTrigger count={message.citations.length} />
                              <SourcesContent>
                                {message.citations.map((citation, idx) => (
                                  <Source
                                    key={idx}
                                    href={citation.url}
                                    title={citation.source}
                                  />
                                ))}
                              </SourcesContent>
                            </Sources>
                          )}
                        </>
                      )}
                    </MessageContent>
                  </Message>
                ))}

                {/* Citaciones globales (parseadas del último mensaje) */}
                {citations.length > 0 && (
                  <Sources>
                    <SourcesTrigger count={citations.length} />
                    <SourcesContent>
                      {citations.map((citation, idx) => (
                        <Source
                          key={idx}
                          href={citation.url}
                          title={citation.source}
                        />
                      ))}
                    </SourcesContent>
                  </Sources>
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
        <div className={cn(
          "bg-card",
          isMobile && "fixed bottom-0 left-0 right-0 z-20 border-t border-border",
          isMobile ? "px-4 pb-[env(safe-area-inset-bottom,16px)] pt-3" : "px-6 py-4"
        )}>
          <div className="mx-auto max-w-3xl">
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
                className="min-h-[60px] resize-none"
              />
              <PromptInputFooter>
                <div className="flex-1" />
                <PromptInputSubmit
                  disabled={!selectedConvenio || !input.trim() || isLoading}
                  status={isLoading ? 'streaming' : undefined}
                />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </div>
      </main>

      {/* VariablesPanel - Derecha */}
      {isMobile || isTablet ? (
        <>
          {/* Panel colapsado visible en tablet */}
          {isTablet && (
            <VariablesPanel
              perfilJson={perfilJson}
              onVariableClick={handleVariableClick}
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
          isCollapsed={isVariablesPanelCollapsed}
          onToggleCollapse={toggleVariablesPanel}
          isMobile={false}
        />
      )}
    </div>
  );
}
