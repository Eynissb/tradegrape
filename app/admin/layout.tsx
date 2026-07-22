import { redirect } from 'next/navigation';
import { getProfile, isStaff } from '@/lib/auth/roles';
import Badge from '@/components/ui/Badge';
import { SideNavProvider, SideNavToggle } from '@/components/ui/SideNav';
import AdminSidebar from './AdminSidebar';

/**
 * Garde /admin : staff uniquement (owner, admin, editor, moderator, analyst).
 * Chrome du back-office : sidebar (navigation) + header (contexte seulement).
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();

  if (!profile) redirect('/login?redirect=/admin');
  if (!isStaff(profile.role)) redirect('/');

  const env = process.env.NODE_ENV === 'production' ? null : 'dev';

  return (
    <SideNavProvider>
    <div className="app-shell ui">
      <AdminSidebar />

      <div className="app-main">
        {/* Le header ne porte plus de navigation : contexte et actions globales. */}
        <header className="app-top admin-top">
          <SideNavToggle />
          <div className="admin-context">
            <Badge variant="neutral" mono>{profile.role}</Badge>
            {env ? <span className="admin-env">{env}</span> : null}
          </div>
        </header>

        <div className="app-content">{children}</div>
      </div>
    </div>
    </SideNavProvider>
  );
}
