import type { TextareaHTMLAttributes } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  id?: string;
  label?: string;
  hint?: string;
  error?: string;
}

/** Zone de texte DS. Compatible Server Component. */
export default function Textarea({
  id,
  name,
  label,
  hint,
  error,
  required,
  rows = 3,
  className,
  ...props
}: TextareaProps) {
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
      <textarea
        id={fieldId}
        name={name}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn('input', className)}
        {...props}
      />
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
