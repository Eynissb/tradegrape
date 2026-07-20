import type { InputHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id?: string;
  label?: string;
  hint?: string;
  error?: string;
  icon?: LucideIcon;
  suffix?: ReactNode;
  /** JetBrains Mono + tabular-nums (champs numériques). */
  mono?: boolean;
}

/**
 * Champ texte DS. Compatible Server Component (aucun hook) :
 * l'id est dérivé de `id` ou `name` pour lier label/erreur.
 */
export default function Input({
  id,
  name,
  label,
  hint,
  error,
  icon: Icon,
  suffix,
  mono = false,
  required,
  className,
  ...props
}: InputProps) {
  const fieldId = id ?? name;
  const describedBy = error
    ? `${fieldId}-error`
    : hint
      ? `${fieldId}-hint`
      : undefined;

  return (
    <div className="field">
      {label ? (
        <label className="label" htmlFor={fieldId}>
          {label}
          {required ? <span className="req"> *</span> : null}
        </label>
      ) : null}
      <div className="input-wrap">
        {Icon ? <Icon aria-hidden="true" /> : null}
        <input
          id={fieldId}
          name={name}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn('input', mono && 'mono', className)}
          {...props}
        />
        {suffix ? <span className="input-suffix">{suffix}</span> : null}
      </div>
      {error ? (
        <p className="field-error" id={`${fieldId}-error`}>
          <AlertCircle aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p className="hint" id={`${fieldId}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
