'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Locale } from '@/lib/i18n/comparator';
import { HOME_DICTS } from '@/lib/i18n/home';
import { buttonClasses } from '@/components/ui/Button';

type Status = 'idle' | 'busy' | 'ok' | 'err';

/**
 * Capture email de la home (section « alertes »). Poste vers /api/public/subscribe,
 * qui appelle la RPC SECURITY DEFINER `record_email_signup` (migration 0016).
 * États explicites (idle / busy / ok / err) + message en aria-live. Aucune donnée
 * lue : on ne fait qu'écrire une inscription idempotente.
 */
export default function EmailCapture({ locale }: { locale: Locale }) {
  const d = HOME_DICTS[locale];
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === 'busy') return;
    setStatus('busy');
    setMessage('');
    try {
      const res = await fetch('/api/public/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale }),
      });
      const json: { ok?: boolean; error?: string } = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setStatus('ok');
        setMessage(d.alertsSuccess);
        setEmail('');
      } else {
        setStatus('err');
        setMessage(json.error === 'invalid_email' ? d.alertsErrorEmail : d.alertsError);
      }
    } catch {
      setStatus('err');
      setMessage(d.alertsError);
    }
  }

  return (
    <div className="alerts-io">
      {status === 'ok' ? (
        <p className="alerts-ok" role="status">
          <svg className="alerts-ok-check" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {message}
        </p>
      ) : (
        <form className="alerts-form" onSubmit={onSubmit} noValidate>
          <input
            type="email"
            name="email"
            className="alerts-input"
            placeholder={d.alertsPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            aria-invalid={status === 'err'}
            aria-label={d.alertsPlaceholder}
          />
          <button type="submit" className={`${buttonClasses({ variant: 'primary' })} alerts-submit`} disabled={status === 'busy'}>
            {status === 'busy' ? d.alertsCtaBusy : d.alertsCta}
          </button>
        </form>
      )}

      <p className={`alerts-note${status === 'err' ? ' alerts-note--err' : ''}`} role="status" aria-live="polite">
        {status === 'err' ? message : d.alertsConsent}
      </p>
    </div>
  );
}
