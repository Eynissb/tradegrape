import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export type BadgeVariant =
  | 'neutral'
  | 'brand'
  | 'magenta'
  | 'ok'
  | 'warn'
  | 'danger';

export interface BadgeProps {
  variant?: BadgeVariant;
  icon?: LucideIcon;
  dot?: boolean;
  mono?: boolean;
  /** Aligne la hauteur sur l'échelle de contrôle (--h-md). */
  md?: boolean;
  className?: string;
  children: ReactNode;
}

export default function Badge({
  variant = 'neutral',
  icon: Icon,
  dot = false,
  mono = false,
  md = false,
  className,
  children,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'badge',
        variant !== 'neutral' && `badge-${variant}`,
        md && 'badge-md',
        mono && 'mono',
        className,
      )}
    >
      {dot ? <span className="badge-dot" /> : null}
      {Icon ? <Icon aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
