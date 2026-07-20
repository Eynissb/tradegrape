import Link from 'next/link';
import { signup } from '../actions';

export const metadata = { title: 'Créer un compte — Tradawave' };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <section className="glass px-8 py-9">
      <h1 className="text-2xl font-bold">Créer un compte</h1>
      <p className="mt-1.5 text-sm" style={{ color: 'var(--ink2)' }}>
        Gratuit. Aucune carte requise.
      </p>

      {error ? <div className="notice notice-error mt-5">{error}</div> : null}

      <form action={signup} className="mt-6 flex flex-col gap-4">
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
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="8 caractères minimum"
          />
        </div>

        <button type="submit" className="btn-grad mt-1 w-full">
          Créer mon compte
        </button>
      </form>

      <p className="mt-6 text-center text-sm" style={{ color: 'var(--ink3)' }}>
        Déjà inscrit ?{' '}
        <Link href="/login" className="link-accent">
          Se connecter
        </Link>
      </p>
    </section>
  );
}
