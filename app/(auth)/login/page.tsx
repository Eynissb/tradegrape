import Link from 'next/link';
import { login } from '../actions';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export const metadata = { title: 'Connexion — Tradegrape' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; redirect?: string }>;
}) {
  const { error, message, redirect } = await searchParams;

  return (
    <section className="lg-glass" style={{ borderRadius: 'var(--r-xl)', padding: '2rem 1.8rem' }}>
      <h1 className="text-2xl font-bold">Se connecter</h1>
      <p className="mt-1.5 text-sm" style={{ color: 'var(--text-2)' }}>
        Accède à ton journal et à tes comparaisons.
      </p>

      {message ? <div className="notice notice-info mt-5">{message}</div> : null}
      {error ? <div className="notice notice-error mt-5">{error}</div> : null}

      <form action={login} className="mt-6 flex flex-col gap-4">
        {redirect ? <input type="hidden" name="redirect" value={redirect} /> : null}

        <Input
          id="email"
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          required
          placeholder="toi@exemple.com"
        />
        <Input
          id="password"
          name="password"
          type="password"
          label="Mot de passe"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />

        <Button type="submit" fullWidth className="mt-1">
          Se connecter
        </Button>
      </form>

      <p className="mt-6 text-center text-sm" style={{ color: 'var(--text-3)' }}>
        Pas encore de compte ?{' '}
        <Link href="/signup" className="link-accent">
          Créer un compte
        </Link>
      </p>
    </section>
  );
}
