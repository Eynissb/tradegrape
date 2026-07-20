import { redirect } from 'next/navigation';
import { getProfile, isStaff } from '@/lib/auth/roles';

/**
 * Garde /admin : staff uniquement (owner, admin, editor, moderator, analyst).
 * - Non connecté  → /login
 * - Connecté mais non-staff → accueil (pas d'accès admin)
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();

  if (!profile) redirect('/login?redirect=/admin');
  if (!isStaff(profile.role)) redirect('/');

  return <>{children}</>;
}
