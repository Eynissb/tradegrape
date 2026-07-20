import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

let tid = 0;

export interface TooltipProps {
  content: ReactNode;
  side?: 'top' | 'bottom';
  id?: string;
  children: ReactNode;
}

/**
 * Infobulle DS — CSS pur (survol + focus clavier via :focus-within).
 * L'enfant est décrit par le tooltip via aria-describedby.
 * Compatible Server Component.
 */
export default function Tooltip({ content, side = 'top', id, children }: TooltipProps) {
  const ttId = id ?? `tt-${(tid += 1)}`;
  return (
    <span className="tooltip-anchor">
      {children}
      <span className={cn('tooltip')} role="tooltip" id={ttId} data-side={side}>
        {content}
      </span>
    </span>
  );
}
