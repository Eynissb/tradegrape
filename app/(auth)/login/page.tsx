import Link from 'next/link';
import { login } from '../actions';

export const metadata = { title: 'Connexion — Tradegrape' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; redirect?: string }>;
}) {
  const { error, message, redirect } = await searchParams;

  return (
    <section className="glass px-8 py-9">
      <h1 className="text-2xl font-bold">Se connecter</h1>
      <p className="mt-1.5 text-sm" style={{ color: 'var(--ink2)' }}>
        Accède à ton journal et à tes comparaisons.
      </p>

      {message ? (
        <div className="notice notice-info mt-5">{message}</div>
      ) : null}
      {error ? <div className="notice notice-error mt-5">{error}</div> : null}

      <form action={login} className="mt-6 flex flex-col gap-4">
        {redirect ? (
          <input type="hidden" name="redirect" value={redirect} />
        ) : null}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            className="input"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="toi@exemple.com"
          />
        </div>

        <div className="field">
          <label htmlFor="password">Mot de passe</label>
          <input
            className="input"
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
          />
        </div>

        <button type="submit" className="btn-grad mt-1 w-full">
          Se connecter
        </button>
      </form>

      <p className="mt-6 text-center text-sm" style={{ color: 'var(--ink3)' }}>
        Pas encore de compte ?{' '}
        <Link href="/signup" className="link-accent">
          Créer un compte
        </Link>
      </p>
    </section>
  );
}
