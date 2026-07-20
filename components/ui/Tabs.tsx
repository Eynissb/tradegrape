'use client';

import { useRef } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface TabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
}

/** Contrôle segmenté DS. Navigation clavier ←/→ (roving tabindex). */
export default function Tabs({ tabs, active, onChange, ariaLabel }: TabsProps) {
  const ref = useRef<HTMLDivElement>(null);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const enabled = tabs.filter((t) => !t.disabled);
    const idx = enabled.findIndex((t) => t.id === active);
    if (idx === -1) return;
    const delta = e.key === 'ArrowRight' ? 1 : -1;
    const next = enabled[(idx + delta + enabled.length) % enabled.length];
    onChange(next.id);
    const btn = ref.current?.querySelector<HTMLButtonElement>(`[data-tab="${next.id}"]`);
    btn?.focus();
  }

  return (
    <div className="tabs" role="tablist" aria-label={ariaLabel} ref={ref} onKeyDown={onKeyDown}>
      {tabs.map((t) => {
        const selected = t.id === active;
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            data-tab={t.id}
            className="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            disabled={t.disabled}
            onClick={() => onChange(t.id)}
          >
            {Icon ? <Icon aria-hidden="true" /> : null}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
