import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonBaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  /** Cercle parfait, icône seule (aria-label requis). */
  iconOnly?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

/** Chaîne de classes DS — pour styler un <Link> ou un <a> à l'identique. */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  iconOnly = false,
  fullWidth = false,
  loading = false,
  className,
}: ButtonBaseProps & { className?: string } = {}): string {
  return cn(
    'btn',
    `btn-${size}`,
    `btn-${variant}`,
    iconOnly && 'btn-icon',
    fullWidth && 'btn-full',
    loading && 'is-loading',
    className,
  );
}

export interface ButtonProps
  extends ButtonBaseProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children?: ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  iconOnly = false,
  loading = false,
  fullWidth = false,
  disabled,
  children,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, iconOnly, fullWidth, loading, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span className="btn-spinner" aria-hidden="true" /> : Icon ? <Icon aria-hidden="true" /> : null}
      {iconOnly ? null : <span className="btn-label">{children}</span>}
      {!loading && IconRight ? <IconRight aria-hidden="true" /> : null}
    </button>
  );
}
