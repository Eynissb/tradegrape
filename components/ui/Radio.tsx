import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface RadioProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

export function Radio({ label, disabled, className, ...props }: RadioProps) {
  return (
    <label className={cn('radio', disabled && 'is-disabled', className)}>
      <input type="radio" disabled={disabled} {...props} />
      <span className="radio-dot" />
      {label}
    </label>
  );
}

export function RadioGroup({
  legend,
  error,
  children,
}: {
  legend: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="radio-group" aria-invalid={error ? true : undefined}>
      <legend>{legend}</legend>
      {children}
      {error ? (
        <p className="field-error" style={{ marginTop: '.35rem' }}>
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

export default Radio;
