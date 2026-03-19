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
import { ScrollArea } from '@ui/components/shadcn/scroll-area';
import { Separator } from '@ui/components/shadcn/separator';
import { AlertConflict } from '@ui/components/workrules/molecules/AlertConflict/AlertConflict';
import { AlertInvalidData } from '@ui/components/workrules/molecules/AlertInvalidData/AlertInvalidData';
import { AlertSMI } from '@ui/components/workrules/molecules/AlertSMI/AlertSMI';
import { ConvenioSelector } from '@ui/components/workrules/organisms/ConvenioSelector/ConvenioSelector';
import { Sidebar } from '@ui/components/workrules/organisms/Sidebar/Sidebar';
import { VariablesPanel } from '@ui/components/workrules/organisms/VariablesPanel/VariablesPanel';
import { Loader2Icon } from 'lucide-react';
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
  mockUserPlan = 'free',
  className,
}: ChatPageProps) {
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

  return (
    <div
      className={cn(
        'flex h-screen w-full overflow-hidden bg-background',
        className
      )}
    >
      {/* Sidebar - Izquierda */}
      <Sidebar
        currentConversationId={currentConversationId ?? undefined}
        conversations={conversations}
        userPlan={mockUserPlan}
        onNewConversation={handleNewConversation}
        onSelectConversation={handleSelectConversation}
        onOpenSettings={handleOpenSettings}
      />

      {/* Área de Chat - Centro */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Header sticky con selector de convenio */}
        <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <div className="flex h-16 items-center gap-4 px-6">
            <ConvenioSelector
              selectedConvenio={selectedConvenio}
              convenios={mockConvenios}
              isLoading={false}
              onSelect={selectConvenio}
              onClear={clearConvenio}
              placeholder={CHAT_TEXTS.convenioSelector.placeholder}
              className="flex-1"
            />
          </div>
        </header>

        {/* Área de mensajes */}
        <ScrollArea className="flex-1 px-6 py-4">
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.length === 0 ? (
              // Estado vacío
              <div className="flex flex-col items-center justify-center py-20 text-center">
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
                <p className="max-w-md text-sm text-muted-foreground">
                  {emptyState.description}
                </p>
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

        <Separator />

        {/* Input de chat */}
        <div className="bg-card px-6 py-4">          <div className="mx-auto max-w-3xl">
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
      <VariablesPanel
        perfilJson={perfilJson}
        onVariableClick={handleVariableClick}
        isCollapsed={isVariablesPanelCollapsed}
        onToggleCollapse={toggleVariablesPanel}
      />
    </div>
  );
}
