import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProfile, isStaff } from '@/lib/auth/roles';
import { signout } from '@/app/(auth)/actions';
import Button from '@/components/ui/Button';

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
          <Link href="/" className="app-brand" aria-label="Tradegrape — accueil">
            <Image
              src="/brand/logo.png"
              alt="Tradegrape"
              width={116}
              height={29}
              priority
            />
            <span className="app-pill">journal</span>
          </Link>

          <nav className="app-nav">
            <Link href="/app">Mes comptes</Link>
            <Link href="/app/analytics">Analytics</Link>
            <Link href="/settings">Préférences</Link>
            {staff ? <Link href="/admin">Admin</Link> : null}
          </nav>

          <form action={signout}>
            <Button type="submit" variant="ghost" size="sm">Déconnexion</Button>
          </form>
        </div>
      </header>

      <div className="flex-1">{children}</div>
    </div>
  );
}
