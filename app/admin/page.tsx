import { getProfile } from '@/lib/auth/roles';
import { signout } from '@/app/(auth)/actions';

export const metadata = { title: 'Admin — Tradawave' };

/** Stub — le back-office sera construit plus tard. Sert à valider la garde staff. */
export default async function AdminHome() {
  const profile = await getProfile();

  return (
    <main className="relative flex flex-1 items-center justify-center px-6 py-16">
      <div className="glow glow-a" style={{ top: '-10%', left: '-8%' }} />

      <section className="glass relative z-10 w-full max-w-lg px-8 py-9 text-center">
        <span
          className="text-xs font-semibold uppercase tracking-[0.2em]"
          style={{ color: 'var(--ink3)' }}
        >
          Back-office · /admin
        </span>
        <h1 className="mt-3 text-3xl font-bold">
          <span className="grad-text">Zone staff</span>
        </h1>
        <p className="mt-3 text-sm" style={{ color: 'var(--ink2)' }}>
          Accès accordé à{' '}
          <span className="num" style={{ color: 'var(--ink)' }}>
            {profile?.email ?? '—'}
          </span>
          {' · '}rôle{' '}
          <span className="num" style={{ color: 'var(--c2)' }}>
            {profile?.role ?? 'user'}
          </span>
        </p>

        <form action={signout} className="mt-7">
          <button type="submit" className="btn-ghost w-full">
            Se déconnecter
          </button>
        </form>
      </section>
    </main>
  );
}
