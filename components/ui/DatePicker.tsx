'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];
const WEEKDAYS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const ymd = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

function parseYmd(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function fmtLong(s: string): string {
  const d = parseYmd(s);
  if (!d) return '';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
function addDays(s: string, n: number): string {
  const d = parseYmd(s) ?? new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return ymd(d);
}
function todayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  id?: string;
  label?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  /** Largeur du champ (défaut : sm — une date est courte). */
  width?: 'sm' | 'md' | 'lg';
}

export default function DatePicker({
  value,
  onChange,
  name,
  id,
  label,
  required,
  hint,
  error,
  width = 'sm',
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [focusDay, setFocusDay] = useState(value || todayStr());
  const [view, setView] = useState(() => {
    const base = parseYmd(value || todayStr())!;
    return { year: base.getUTCFullYear(), month: base.getUTCMonth() };
  });
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const [mobile, setMobile] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  const fieldId = id ?? name ?? uid;
  const today = todayStr();

  // Positionnement de la popover (portal) — flip vers le haut si pas de place.
  useLayoutEffect(() => {
    if (!open || typeof window === 'undefined') return;
    const isMobile = window.matchMedia('(max-width: 480px)').matches;
    setMobile(isMobile);
    if (isMobile) return;
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const popH = 330;
    const below = window.innerHeight - r.bottom;
    const top = below < popH && r.top > popH ? r.top - popH - 6 : r.bottom + 6;
    setCoords({ top, left: r.left, width: Math.max(r.width, 288) });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!popRef.current?.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // Focus le jour actif à l'ouverture et à chaque déplacement clavier.
  useEffect(() => {
    if (!open) return;
    const el = popRef.current?.querySelector<HTMLButtonElement>('[data-focused="true"]');
    el?.focus();
  }, [open, focusDay]);

  function openPicker() {
    const base = parseYmd(value || todayStr())!;
    setView({ year: base.getUTCFullYear(), month: base.getUTCMonth() });
    setFocusDay(value || todayStr());
    setOpen(true);
  }

  function commit(day: string) {
    onChange(day);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function move(days: number) {
    const next = addDays(focusDay, days);
    setFocusDay(next);
    const d = parseYmd(next)!;
    setView({ year: d.getUTCFullYear(), month: d.getUTCMonth() });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case 'Escape': e.preventDefault(); setOpen(false); triggerRef.current?.focus(); break;
      case 'ArrowLeft': e.preventDefault(); move(-1); break;
      case 'ArrowRight': e.preventDefault(); move(1); break;
      case 'ArrowUp': e.preventDefault(); move(-7); break;
      case 'ArrowDown': e.preventDefault(); move(7); break;
      case 'PageUp': e.preventDefault(); move(-28); break;
      case 'PageDown': e.preventDefault(); move(28); break;
      case 'Enter':
      case ' ': e.preventDefault(); commit(focusDay); break;
    }
  }

  function shiftMonth(delta: number) {
    setView((v) => {
      const m = v.month + delta;
      return { year: v.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });
  }

  // Grille du mois affiché (lundi → dimanche).
  const first = new Date(Date.UTC(view.year, view.month, 1));
  const startOffset = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(view.year, view.month + 1, 0)).getUTCDate();
  const cells: { key: string; day: number; inMonth: boolean }[] = [];
  const total = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  for (let i = 0; i < total; i++) {
    const d = new Date(Date.UTC(view.year, view.month, 1 - startOffset + i));
    cells.push({ key: ymd(d), day: d.getUTCDate(), inMonth: d.getUTCMonth() === view.month });
  }

  const describedBy = error ? `${fieldId}-err` : hint ? `${fieldId}-hint` : undefined;

  const calendar = (
    <div
      ref={popRef}
      className={cn('dp-pop lg-glass', mobile && 'dp-pop-sheet')}
      role="dialog"
      aria-modal={mobile ? true : undefined}
      aria-label="Choisir une date"
      onKeyDown={onKeyDown}
      style={
        mobile
          ? undefined
          : coords
            ? { position: 'fixed', top: coords.top, left: coords.left, width: coords.width }
            : { display: 'none' }
      }
    >
      <div className="dp-head">
        <button type="button" className="dp-nav" aria-label="Mois précédent" onClick={() => shiftMonth(-1)}>
          <ChevronLeft aria-hidden="true" />
        </button>
        <span className="dp-title">{MONTHS[view.month]} {view.year}</span>
        <button type="button" className="dp-nav" aria-label="Mois suivant" onClick={() => shiftMonth(1)}>
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
      <div className="dp-wds">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="dp-wd">{w}</span>
        ))}
      </div>
      <div className="dp-grid" role="grid">
        {cells.map((c) => {
          const selected = c.key === value;
          const isToday = c.key === today;
          const focused = c.key === focusDay;
          return (
            <button
              key={c.key}
              type="button"
              role="gridcell"
              data-focused={focused}
              tabIndex={focused ? 0 : -1}
              aria-selected={selected}
              className={cn(
                'dp-day',
                !c.inMonth && 'is-outside',
                selected && 'is-selected',
                isToday && !selected && 'is-today',
              )}
              onClick={() => commit(c.key)}
            >
              {c.day}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={cn('field', width && `field-${width}`)}>
      {label ? (
        <label className="label" htmlFor={fieldId}>
          {label}
          {required ? <span className="req"> *</span> : null}
        </label>
      ) : null}
      {name ? <input type="hidden" name={name} value={value} required={required} /> : null}
      <button
        ref={triggerRef}
        type="button"
        id={fieldId}
        className="select-trigger dp-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onClick={() => (open ? setOpen(false) : openPicker())}
      >
        <span className={value ? undefined : 'placeholder'}>
          {value ? fmtLong(value) : 'jj/mm/aaaa'}
        </span>
        <Calendar className="chevron" aria-hidden="true" />
      </button>

      {open && typeof document !== 'undefined'
        ? createPortal(
            mobile ? (
              <div className="dp-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
                {calendar}
              </div>
            ) : (
              calendar
            ),
            document.body,
          )
        : null}

      {error ? (
        <p className="field-error" id={`${fieldId}-err`}>
          <AlertCircle aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p className="hint" id={`${fieldId}-hint`}>{hint}</p>
      ) : null}
    </div>
  );
}
