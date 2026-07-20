import type { InputHTMLAttributes } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
}

/**
 * Input natif masqué, coche dessinée à côté : focus clavier et logique
 * de formulaire restent natifs. Compatible Server Component.
 */
export default function Checkbox({
  label,
  error,
  disabled,
  className,
  ...props
}: CheckboxProps) {
  return (
    <>
      <label className={cn('check', disabled && 'is-disabled', error && 'has-error', className)}>
        <input
          type="checkbox"
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          {...props}
        />
        <span className="check-box">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2.5 8.5 6 12l7.5-8" />
          </svg>
        </span>
        {label}
      </label>
      {error ? (
        <p className="field-error" style={{ marginTop: '.1rem' }}>
          <AlertCircle aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </>
  );
}
