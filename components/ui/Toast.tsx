'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CircleCheck, CircleX, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/lib/cn';

type ToastVariant = 'info' | 'ok' | 'warn' | 'danger';

interface ToastItem {
  id: number;
  variant: ToastVariant;
  title: ReactNode;
  description?: ReactNode;
}

interface ToastApi {
  info: (title: ReactNode, opts?: { description?: ReactNode; duration?: number }) => void;
  success: (title: ReactNode, opts?: { description?: ReactNode; duration?: number }) => void;
  warn: (title: ReactNode, opts?: { description?: ReactNode; duration?: number }) => void;
  error: (title: ReactNode, opts?: { description?: ReactNode; duration?: number }) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast doit être utilisé dans <ToastProvider>');
  return ctx;
}

const ICONS = { info: Info, ok: CircleCheck, warn: TriangleAlert, danger: CircleX } as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const remove = useCallback((id: number) => {
    setItems((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (variant: ToastVariant, title: ReactNode, opts?: { description?: ReactNode; duration?: number }) => {
      const id = (seq.current += 1);
      setItems((cur) => [...cur, { id, variant, title, description: opts?.description }]);
      const duration = opts?.duration ?? 5000;
      window.setTimeout(() => remove(id), duration);
    },
    [remove],
  );

  const api: ToastApi = {
    info: (t, o) => push('info', t, o),
    success: (t, o) => push('ok', t, o),
    warn: (t, o) => push('warn', t, o),
    error: (t, o) => push('danger', t, o),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {items.map((t) => {
          const Icon = ICONS[t.variant];
          return (
            <div
              key={t.id}
              className={cn('toast lg-glass', t.variant !== 'info' && `toast-${t.variant}`, t.variant === 'info' && 'toast-info')}
              role={t.variant === 'danger' ? 'alert' : undefined}
            >
              <Icon aria-hidden="true" />
              <div className="toast-content">
                <span className="toast-title">{t.title}</span>
                {t.description ? <span className="toast-desc">{t.description}</span> : null}
              </div>
              <button className="toast-close" type="button" aria-label="Fermer" onClick={() => remove(t.id)}>
                <X aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
