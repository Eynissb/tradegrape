import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface SwitchProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

/** Interrupteur DS (checkbox natif masqué). Compatible Server Component. */
export default function Switch({ label, disabled, className, ...props }: SwitchProps) {
  return (
    <label className={cn('switch', disabled && 'is-disabled', className)}>
      <input type="checkbox" disabled={disabled} {...props} />
      <span className="switch-track" />
      {label}
    </label>
  );
}
