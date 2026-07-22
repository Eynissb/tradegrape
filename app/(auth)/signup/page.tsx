import Link from 'next/link';
import { signup } from '../actions';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export const metadata = { title: 'Créer un compte — Tradegrape' };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <section className="card auth-card">
      <h1 className="auth-h1">Créer un compte</h1>
      <p className="jsub mt-1">
        Gratuit. Aucune carte requise.
      </p>

      {error ? <div className="notice notice-error mt-5">{error}</div> : null}

      <form action={signup} className="mt-6 flex flex-col gap-4">
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
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="8 caractères minimum"
        />

        <Button type="submit" fullWidth className="mt-1">
          Créer mon compte
        </Button>
      </form>

      <p className="auth-alt mt-6">
        Déjà inscrit ?{' '}
        <Link href="/login" className="link-accent">
          Se connecter
        </Link>
      </p>
    </section>
  );
}
