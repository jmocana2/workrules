"use client";

import { cn } from "@/lib/utils";
import { Title } from "@ui/components/workrules/atoms/Title/Title";
import type { ComponentProps, HTMLAttributes } from "react";
import { memo } from "react";
import { type ExtraProps, Streamdown } from "streamdown";

export type MessageResponseProps = ComponentProps<typeof Streamdown>;

type HeadingComponentProps = HTMLAttributes<HTMLHeadingElement> & ExtraProps;

const messageComponents = {
  h1: ({ node: _node, ...props }: HeadingComponentProps) => <Title as="h1" {...props} />,
  h2: ({ node: _node, ...props }: HeadingComponentProps) => <Title as="h2" {...props} />,
  h3: ({ node: _node, ...props }: HeadingComponentProps) => <Title as="h3" {...props} />,
  h4: ({ node: _node, ...props }: HeadingComponentProps) => <Title as="h4" {...props} />,
  h5: ({ node: _node, ...props }: HeadingComponentProps) => <Title as="h5" {...props} />,
  h6: ({ node: _node, ...props }: HeadingComponentProps) => <Title as="h6" {...props} />,
};

export const MessageResponse = memo(
  ({ className, components, ...props }: MessageResponseProps) => (
    <Streamdown
      className={cn(
        "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className
      )}
      components={{ ...messageComponents, ...components }}
      {...props}
    />
  ),
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    prevProps.className === nextProps.className &&
    prevProps.components === nextProps.components
);

MessageResponse.displayName = "MessageResponse";

export default MessageResponse;
