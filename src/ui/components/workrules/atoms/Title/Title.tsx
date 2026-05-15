import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

type TitleLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

export interface TitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: TitleLevel;
}

const levelStyles: Record<TitleLevel, string> = {
  h1: 'text-xl font-bold leading-snug mt-4 mb-1',
  h2: 'text-lg font-bold leading-snug mt-4 mb-1',
  h3: 'text-base font-semibold leading-snug mt-3 mb-1',
  h4: 'text-base font-semibold leading-snug mt-2 mb-0.5',
  h5: 'text-sm font-medium leading-snug mt-2 mb-0.5',
  h6: 'text-sm font-medium leading-snug mt-2 mb-0.5 text-muted-foreground',
};

export function Title({ as: Tag = 'h2', className, children, ...props }: TitleProps) {
  return (
    <Tag className={cn(levelStyles[Tag], className)} {...props}>
      {children}
    </Tag>
  );
}
