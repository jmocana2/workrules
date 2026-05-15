import { Message, MessageContent } from '@ui/components/ai-elements/message';
import type { HTMLAttributes } from 'react';

export interface UserMessageProps extends HTMLAttributes<HTMLDivElement> {
  content: string;
}

export function UserMessage({ content, className, ...props }: UserMessageProps) {
  return (
    <Message from="user" className={className} {...props}>
      <MessageContent className="user-message-bubble">
        <p className="whitespace-pre-wrap text-sm">{content}</p>
      </MessageContent>
    </Message>
  );
}
