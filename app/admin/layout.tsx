import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getProfile, isStaff } from '@/lib/auth/roles';
import { signout } from '@/app/(auth)/actions';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

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
          <Link href="/" className="admin-brand" aria-label="Tradegrape — accueil">
            <Image
              src="/brand/logo.png"
              alt="Tradegrape"
              width={116}
              height={29}
              priority
            />
            <span className="admin-pill">admin</span>
          </Link>

          <nav className="admin-nav">
            <Link href="/admin/firms">Firms</Link>
            <Link href="/admin/requested-firms">Demandes</Link>
            <span className="admin-soon">Plans · Offers · Promos (à venir)</span>
          </nav>

          <div className="admin-user">
            <Badge variant="brand" mono>{profile.role}</Badge>
            <form action={signout}>
              <Button type="submit" variant="ghost" size="sm">Déconnexion</Button>
            </form>
          </div>
        </div>
      </header>

      <main className="admin-main">{children}</main>
    </div>
  );
}
