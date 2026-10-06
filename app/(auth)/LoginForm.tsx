'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { login } from './actions';
import { createClient } from '@/lib/supabase/client';
import { buttonClasses } from '@/components/ui/Button';

function GoogleG() {
  return (
    <svg className="authf-google-g" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.24 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.29 9.14 5.38 12 5.38z" />
    </svg>
  );
}

export default function LoginForm({
  error,
  message,
  redirect,
}: {
  error?: string;
  message?: string;
  redirect?: string;
}) {
  const [show, setShow] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [valid, setValid] = useState(false);

  async function google() {
    setOauthBusy(true);
    const supabase = createClient();
    const next = redirect && redirect.startsWith('/') ? redirect : '/app';
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (e) setOauthBusy(false);
  }

  return (
    <div className="authf">
      <h1 className="auth-h1">Se connecter</h1>
      <p className="authf-sub">Accède à ton journal et à tes comparaisons.</p>

      {message ? <div className="notice notice-info authf-notice-err">{message}</div> : null}
      {error ? <div className="notice notice-error authf-notice-err">{error}</div> : null}

      <button type="button" className="authf-google" onClick={google} disabled={oauthBusy}>
        <GoogleG />
        {oauthBusy ? 'Redirection…' : 'Continuer avec Google'}
      </button>

      <div className="authf-or"><span>ou avec ton email</span></div>

      <form
        action={login}
        className="authf-form"
        onInput={(e) => setValid(e.currentTarget.checkValidity())}
      >
        {redirect ? <input type="hidden" name="redirect" value={redirect} /> : null}

        <div className="field">
          <label className="label" htmlFor="email">Email<span className="req"> *</span></label>
          <div className="input-wrap">
            <input id="email" name="email" className="input" type="email" required autoComplete="email" placeholder="toi@exemple.com" />
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="password">Mot de passe<span className="req"> *</span></label>
          <div className="input-wrap">
            <input
              id="password"
              name="password"
              className="input"
              type={show ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
            <button
              type="button"
              className="authf-eye"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {show ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>
        </div>

        <button type="submit" className={`${buttonClasses({})} btn-full authf-submit`} disabled={!valid}>
          Se connecter
        </button>
      </form>

      <p className="auth-alt authf-alt">
        Pas encore de compte ?{' '}
        <Link href="/signup" className="link-accent">Créer un compte</Link>
      </p>
    </div>
  );
}
