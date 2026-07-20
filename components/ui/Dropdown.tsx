'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface DropdownProps {
  /** Élément déclencheur (bouton). */
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: ReactNode;
  align?: 'start' | 'end';
}

/** Menu flottant DS (surface glass), fermé au clic extérieur / Échap. */
export default function Dropdown({ trigger, children, align = 'start' }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="dropdown" ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open ? (
        <div
          className={cn('dropdown-menu lg-glass')}
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            [align === 'end' ? 'right' : 'left']: 0,
            zIndex: 40,
            minWidth: 180,
            borderRadius: 'var(--r-md)',
            padding: '.3rem',
            animation: 'lg-materialize .24s var(--ease-out-soft)',
          }}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
