import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
  children: ReactNode;
}

/**
 * Surface de CONTENU — solide (jamais de verre sur les chiffres).
 * Pour une carte cliquable, utiliser un <Link className="card card-interactive">.
 */
export default function Card({ glow = false, className, children, ...props }: CardProps) {
  return (
    <div className={cn('card', glow && 'card-glow', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('card-header', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('card-title', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('card-footer', className)} {...props}>
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  trend,
}: {
  label: ReactNode;
  value: ReactNode;
  trend?: 'up' | 'down';
}) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className={cn('stat-value', trend)}>{value}</span>
    </div>
  );
}
