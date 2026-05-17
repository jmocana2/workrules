"use client";

import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/ui/components/shadcn/collapsible";
import { BookIcon, ChevronDownIcon } from "lucide-react";

export type SourcesProps = ComponentProps<"div">;

export const Sources = ({ className, ...props }: SourcesProps) => (
  <Collapsible
    className={cn("not-prose mb-4 text-primary text-xs", className)}
    {...props}
  />
);

export type SourcesTriggerProps = ComponentProps<typeof CollapsibleTrigger> & {
  count: number;
};

export const SourcesTrigger = ({
  className,
  count,
  children,
  ...props
}: SourcesTriggerProps) => (
  <CollapsibleTrigger
    className={cn("flex items-center gap-2", className)}
    {...props}
  >
    {children ?? (
      <>
        <p className="font-medium">{count === 1 ? "1 fuente" : `${count} fuentes`}</p>
        <ChevronDownIcon className="h-4 w-4" />
      </>
    )}
  </CollapsibleTrigger>
);

export type SourcesContentProps = ComponentProps<typeof CollapsibleContent>;

export const SourcesContent = ({
  className,
  ...props
}: SourcesContentProps) => (
  <CollapsibleContent
    className={cn(
      "mt-3 flex w-fit flex-col gap-2",
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
      className
    )}
    {...props}
  />
);

export type SourceProps = Omit<ComponentProps<"a">, "href"> & {
  href?: string;
  pagina?: number;
};

export const Source = ({ href, title, pagina, children, className, ...props }: SourceProps) => {
  const hrefWithPage = href && pagina ? `${href}#page=${pagina}` : href;

  const content = children ?? (
    <>
      <BookIcon className="h-4 w-4 shrink-0" />
      <span className="block font-medium">{title}</span>
      {pagina && (
        <span className="text-muted-foreground">p. {pagina}</span>
      )}
    </>
  );

  if (!hrefWithPage) {
    return (
      <span className={cn("flex items-center gap-2 text-muted-foreground", className)}>
        {content}
      </span>
    );
  }

  return (
    <a
      aria-label={title ? `Abrir PDF oficial - ${title}` : "Abrir PDF oficial"}
      className={cn("flex items-center gap-2", className)}
      href={hrefWithPage}
      rel="noopener noreferrer"
      target="_blank"
      {...props}
    >
      {content}
    </a>
  );
};
