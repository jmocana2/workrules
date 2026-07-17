import { cn } from '@/lib/utils';
import { CHAT_TEXTS } from '@constants/texts';
import { Message, MessageContent } from '@ui/components/ai-elements/message';
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
import {
  VariableChips,
  type VariableChip,
} from '@ui/components/workrules/molecules/VariableChips/VariableChips';
import { ConvenioSelector } from '@ui/components/workrules/organisms/ConvenioSelector/ConvenioSelector';
import { Loader2Icon, MenuIcon, SlidersIcon } from 'lucide-react';
import { lazy, Suspense, type ChangeEvent, type RefObject } from 'react';
import type {
  AlertConflictPayload,
  AlertInvalidDataPayload,
  AlertSMIPayload,
  AlertState,
  ChatMessage,
  ConflictOption,
  Convenio,
  DataRequestState,
} from '../ChatPage.types';
import { MessageCitations } from './MessageCitations';
import { useMobileInputHeight } from '../hooks/useMobileInputHeight';

const MessageResponse = lazy(() =>
  import('@ui/components/ai-elements/message-response').then((m) => ({
    default: m.MessageResponse,
  })),
);

export interface ChatConversationColumnProps {
  // Viewport
  isMobile: boolean;
  isTablet: boolean;

  // Convenio
  selectedConvenio: Convenio | null;
  convenios: Convenio[];
  loadingConvenios: boolean;
  selectConvenio: (convenio: Convenio) => void;
  clearConvenio: () => void;

  // Mensajes y stream
  messages: ChatMessage[];
  isLoading: boolean;
  messagesEndRef: RefObject<HTMLDivElement | null>;

  // Empty state
  emptyState: { title: string; description: string };

  // Alertas del protocolo
  alertState: AlertState;
  handleAlertDismiss: () => void;
  handleSMIViewDetails: () => void;
  handleInvalidDataSuggestion: (suggestion: string) => void;
  handleConflictOption: (option: ConflictOption) => void | Promise<void>;

  // Data request
  dataRequestState: DataRequestState;
  handleDataRequestSubmit: (data: Record<string, string>) => void;
  handleDataRequestSkip: () => void;

  // Input y prompt
  input: string;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  handleInputChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  handlePromptSubmit: (message: { text: string; files: unknown[] }) => Promise<void> | void;
  canSubmit: (text: string) => boolean;

  // Variables chip / modo salario
  activeVariables: Record<string, string>;
  handleVariableRemove: (name: string) => void;
  humanizeVariableLabel: (name: string) => string;
  salaryMode: boolean;
  setSalaryMode: (active: boolean) => void;

  // Citaciones (PDF)
  handleOpenConvenioPdf: (convenioId: string, options?: { page?: number | null }) => void;

  // Drawers de las otras columnas
  onOpenSidebar: () => void;
  onOpenVariablesPanel: () => void;
}

/**
 * Columna central del ChatPage: hilo de conversación.
 * Renderiza el header sticky con `ConvenioSelector`, el ScrollArea con la lista
 * de mensajes/citaciones/alertas del protocolo/indicador de typing y el
 * `PromptInput` (fijo en mobile, estático en desktop). Los botones de hamburger
 * y variables delegan la apertura de los drawers vecinos vía callbacks.
 */
export function ChatConversationColumn({
  isMobile,
  isTablet,
  selectedConvenio,
  convenios,
  loadingConvenios,
  selectConvenio,
  clearConvenio,
  messages,
  isLoading,
  messagesEndRef,
  emptyState,
  alertState,
  handleAlertDismiss,
  handleSMIViewDetails,
  handleInvalidDataSuggestion,
  handleConflictOption,
  dataRequestState,
  handleDataRequestSubmit,
  handleDataRequestSkip,
  input,
  inputRef,
  handleInputChange,
  handlePromptSubmit,
  canSubmit,
  activeVariables,
  handleVariableRemove,
  humanizeVariableLabel,
  salaryMode,
  setSalaryMode,
  handleOpenConvenioPdf,
  onOpenSidebar,
  onOpenVariablesPanel,
}: ChatConversationColumnProps) {
  const isCompact = isMobile || isTablet;
  const { ref: setMobileInputEl, height: mobileInputHeight } = useMobileInputHeight(isMobile);

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      {selectedConvenio ? (
        <header className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/60">
          <div className="flex h-16 items-start gap-2 px-3 py-3 md:gap-4 md:px-6">
            {isCompact && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onOpenSidebar}
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

            {isCompact && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onOpenVariablesPanel}
                aria-label="Ver variables"
                className="shrink-0"
              >
                <SlidersIcon className="h-5 w-5" />
              </Button>
            )}
          </div>
        </header>
      ) : (
        isCompact && (
          <header className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/60">
            <div className="flex h-16 items-center justify-between gap-2 px-3 md:gap-4 md:px-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={onOpenSidebar}
                aria-label="Abrir menú"
              >
                <MenuIcon className="h-5 w-5" />
              </Button>
              <Logo variant="full" size="md" />
              <div className="w-10" />
            </div>
          </header>
        )
      )}

      <ScrollArea className={cn('flex-1 overflow-hidden py-4', 'px-4 md:px-6')}>
        <div
          className="mx-auto max-w-3xl space-y-6"
          style={
            isMobile && mobileInputHeight > 0
              ? { paddingBottom: mobileInputHeight + 16 }
              : undefined
          }
        >
          {messages.length === 0 ? (
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
              <h2 className="mb-2 text-lg font-semibold text-foreground">{emptyState.title}</h2>
              <p className="mb-6 max-w-md text-sm text-muted-foreground">
                {emptyState.description}
              </p>

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
            <>
              {messages.map((message) =>
                message.role === 'user' ? (
                  <UserMessage key={message.id} content={message.content} />
                ) : (
                  <Message key={message.id} from={message.role}>
                    <MessageContent>
                      {/* TODO TFM.7-G: envolver con ErrorBoundary global (junto a Sentry) */}
                      <Suspense
                        fallback={<span className="text-sm opacity-60">{message.content}</span>}
                      >
                        <MessageResponse>{message.content}</MessageResponse>
                      </Suspense>
                      {message.citations && message.citations.length > 0 && (
                        <MessageCitations
                          citations={message.citations}
                          convenioId={selectedConvenio?.id}
                          onOpenPdf={handleOpenConvenioPdf}
                          hidePerCitationLinks={isCompact}
                        />
                      )}
                    </MessageContent>
                  </Message>
                ),
              )}
            </>
          )}

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

      <div
        ref={setMobileInputEl}
        className={cn(
          'bg-card',
          isMobile && 'fixed bottom-0 left-0 right-0 z-20 border-t border-border',
          isMobile ? 'px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3' : 'px-6 py-4',
        )}
      >
        <div className="mx-auto max-w-3xl">
          <VariableChips
            chips={Object.entries(activeVariables).map(
              ([name, value]): VariableChip => ({
                name,
                label: humanizeVariableLabel(name),
                value,
              }),
            )}
            onRemove={handleVariableRemove}
          />
          <PromptInput onSubmit={handlePromptSubmit} className="w-full">
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
  );
}
