import {
  InlineCitation,
  InlineCitationCard,
  InlineCitationCardBody,
  InlineCitationCardTrigger,
  InlineCitationCarousel,
  InlineCitationCarouselContent,
  InlineCitationCarouselHeader,
  InlineCitationCarouselIndex,
  InlineCitationCarouselItem,
  InlineCitationCarouselNext,
  InlineCitationCarouselPrev,
  InlineCitationText
} from '@/ui/components/ai-elements/inline-citation';
import { Message, MessageContent, MessageResponse } from '@/ui/components/ai-elements/message';
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage
} from '@/ui/components/ai-elements/prompt-input';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger
} from '@/ui/components/ai-elements/reasoning';
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger
} from '@/ui/components/ai-elements/sources';
import { Button } from '@/ui/components/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/ui/components/shadcn/card';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useEffect, useState } from 'react';

const SOURCE_ITEMS = [
  {
    href: 'https://www.boe.es/',
    title: 'BOE - Convenios colectivos'
  },
  {
    href: 'https://www.mites.gob.es/',
    title: 'MITES - Relaciones laborales'
  }
] as const;

const getMessageText = (message: UIMessage): string => {
  const legacyContent = (message as { content?: unknown }).content;
  if (typeof legacyContent === 'string' && legacyContent.length > 0) {
    return legacyContent;
  }

  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map(part => part.text)
    .join('\n');
};

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' })
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = () => {
    setTheme(currentTheme => (currentTheme === 'dark' ? 'light' : 'dark'));
  };

  const handlePromptSubmit = async (prompt: PromptInputMessage) => {
    if (!prompt.text || !prompt.text.trim()) {
      return;
    }

    await sendMessage({ text: prompt.text });
  };

  return (
    <main className="min-h-screen bg-background text-foreground p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-primary">WorkRules</h1>
            <p className="text-muted-foreground">Consulta de Convenios Colectivos</p>
          </div>

          <Button type="button" variant="outline" onClick={toggleTheme}>
            Tema: {theme === 'dark' ? 'Oscuro' : 'Claro'}
          </Button>
        </header>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Demo Tailwind + shadcn/ui + AI Elements</CardTitle>
            <CardDescription>
              Validación de integración con `useChat()` y componentes de Vercel AI Elements.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="max-h-[360px] space-y-4 overflow-y-auto rounded-md border border-border bg-background p-4">
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Escribe una pregunta para probar el flujo de chat con AI Elements.
                </p>
              ) : (
                messages.map(message => {
                  const text = getMessageText(message);
                  const isAssistant = message.role === 'assistant';

                  return (
                    <Message from={message.role} key={message.id}>
                      <MessageContent>
                        {isAssistant ? (
                          <>
                            <Reasoning isStreaming={status === 'streaming'}>
                              <ReasoningTrigger />
                              <ReasoningContent>
                                Revisando contexto legal, detectando convenio aplicable y preparando respuesta.
                              </ReasoningContent>
                            </Reasoning>

                            <MessageResponse>{text}</MessageResponse>

                            <Sources>
                              <SourcesTrigger count={SOURCE_ITEMS.length} />
                              <SourcesContent>
                                {SOURCE_ITEMS.map(source => (
                                  <Source href={source.href} key={source.href} title={source.title} />
                                ))}
                              </SourcesContent>
                            </Sources>

                            <InlineCitation>
                              <InlineCitationText>Referencia BOE relevante</InlineCitationText>
                              <InlineCitationCard>
                                <InlineCitationCardTrigger
                                  sources={SOURCE_ITEMS.map(source => source.href)}
                                />
                                <InlineCitationCardBody>
                                  <InlineCitationCarousel>
                                    <InlineCitationCarouselHeader>
                                      <InlineCitationCarouselPrev />
                                      <InlineCitationCarouselIndex />
                                      <InlineCitationCarouselNext />
                                    </InlineCitationCarouselHeader>
                                    <InlineCitationCarouselContent>
                                      {SOURCE_ITEMS.map(source => (
                                        <InlineCitationCarouselItem key={source.href}>
                                          <a
                                            className="text-sm text-primary underline"
                                            href={source.href}
                                            rel="noreferrer"
                                            target="_blank"
                                          >
                                            {source.title}
                                          </a>
                                        </InlineCitationCarouselItem>
                                      ))}
                                    </InlineCitationCarouselContent>
                                  </InlineCitationCarousel>
                                </InlineCitationCardBody>
                              </InlineCitationCard>
                            </InlineCitation>
                          </>
                        ) : (
                          <MessageResponse>{text}</MessageResponse>
                        )}
                      </MessageContent>
                    </Message>
                  );
                })
              )}
            </div>

            <PromptInput onSubmit={handlePromptSubmit}>
              <PromptInputBody>
                <PromptInputTextarea placeholder="Pregunta por salario, jornada o convenio aplicable..." />
              </PromptInputBody>
              <PromptInputFooter>
                <PromptInputSubmit
                  onStop={() => {
                    void stop();
                  }}
                  status={status}
                />
              </PromptInputFooter>
            </PromptInput>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default App;
