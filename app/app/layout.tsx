import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProfile, isStaff } from '@/lib/auth/roles';
import { signout } from '@/app/(auth)/actions';

/** Garde /app : utilisateur connecté requis, + chrome commun du journal. */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/app');

  const profile = await getProfile();
  const staff = profile ? isStaff(profile.role) : false;

  return (
    <div className="flex min-h-full flex-col">
      <header className="app-bar">
        <div className="app-bar-in">
          <Link href="/app" className="app-brand">
            <span className="logomark h-7 w-7">
              <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
                <path
                  d="M3 17l5-6 4 4 5-8 4 5"
                  stroke="var(--on-accent)"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            Tradawave
            <span className="app-pill">journal</span>
          </Link>

          <nav className="app-nav">
            <Link href="/app">Mes comptes</Link>
            {staff ? <Link href="/admin">Admin</Link> : null}
          </nav>

          <form action={signout}>
            <button type="submit" className="app-signout">
              Déconnexion
            </button>
          </form>
        </div>
      </header>

      <div className="flex-1">{children}</div>
    </div>
  );
}
