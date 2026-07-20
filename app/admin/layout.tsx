import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getProfile, isStaff } from '@/lib/auth/roles';
import { signout } from '@/app/(auth)/actions';

/**
 * Garde /admin : staff uniquement (owner, admin, editor, moderator, analyst).
 * Fournit aussi le chrome commun du back-office (barre + navigation).
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();

  if (!profile) redirect('/login?redirect=/admin');
  if (!isStaff(profile.role)) redirect('/');

  return (
    <div className="flex min-h-full flex-col">
      <header className="admin-bar">
        <div className="admin-bar-in">
          <Link href="/admin" className="admin-brand">
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
            <span className="admin-pill">admin</span>
          </Link>

          <nav className="admin-nav">
            <Link href="/admin/firms">Firms</Link>
            <span className="admin-soon">Plans · Offers · Promos (à venir)</span>
          </nav>

          <div className="admin-user">
            <span className="admin-role num">{profile.role}</span>
            <form action={signout}>
              <button type="submit" className="admin-signout">
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="admin-main">{children}</main>
    </div>
  );
}
