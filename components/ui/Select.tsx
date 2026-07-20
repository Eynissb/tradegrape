'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface SelectOption {
  value: string;
  label: string;
  icon?: LucideIcon;
}

export interface SelectProps {
  label?: string;
  options: SelectOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  hint?: string;
  required?: boolean;
  /** Nom du champ caché pour la soumission de formulaire. */
  name?: string;
}

/** Select custom DS (liste glass). Jamais le <select> natif. */
export default function Select({
  label,
  options,
  value,
  onChange,
  placeholder = 'Choisir…',
  disabled,
  error,
  hint,
  required,
  name,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const selected = options.find((o) => o.value === value) ?? null;

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  function commit(i: number) {
    const opt = options[i];
    if (opt) {
      onChange(opt.value);
      setOpen(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === 'Escape') setOpen(false);
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(options.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(options.length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); commit(active); }
  }

  const describedBy = error ? `${labelId}-err` : hint ? `${labelId}-hint` : undefined;

  return (
    <div className="field">
      {label ? (
        <span className="label" id={`${labelId}-label`}>
          {label}
          {required ? <span className="req"> *</span> : null}
        </span>
      ) : null}
      {name ? <input type="hidden" name={name} value={value ?? ''} /> : null}
      <div className={cn('select', open && 'is-open')} ref={rootRef} onKeyDown={onKeyDown}>
        <button
          type="button"
          className="select-trigger"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-labelledby={label ? `${labelId}-label` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
        >
          {selected ? <span>{selected.label}</span> : <span className="placeholder">{placeholder}</span>}
          <ChevronDown className="chevron" aria-hidden="true" />
        </button>
        <ul className="select-list lg-glass" role="listbox" aria-labelledby={label ? `${labelId}-label` : undefined}>
          {options.map((o, i) => {
            const Icon = o.icon;
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={o.value === value}
                className={cn('select-option', i === active && 'is-active')}
                onMouseEnter={() => setActive(i)}
                onClick={() => commit(i)}
              >
                {Icon ? <Icon aria-hidden="true" /> : null}
                {o.label}
              </li>
            );
          })}
        </ul>
      </div>
      {error ? (
        <p className="field-error" id={`${labelId}-err`}>
          <AlertCircle aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p className="hint" id={`${labelId}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
