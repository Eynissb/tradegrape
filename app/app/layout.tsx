import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProfile, isStaff } from '@/lib/auth/roles';
import { Search, Bell } from 'lucide-react';
import AppSidebar from './AppSidebar';

/** Garde /app : utilisateur connecté requis, + chrome commun du journal (sidebar + header). */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/app');

  const profile = await getProfile();
  const staff = profile ? isStaff(profile.role) : false;
  const name = profile?.display_name ?? user.email?.split('@')[0] ?? 'Trader';
  const email = profile?.email ?? user.email ?? '';
  const initials = name.trim().slice(0, 2).toUpperCase();

  return (
    <div className="app-shell">
      <AppSidebar staff={staff} />

      <div className="app-main">
        <header className="app-top">
          <div className="app-search">
            <Search aria-hidden="true" />
            <input type="search" placeholder="Rechercher…" aria-label="Rechercher" />
          </div>

          <div className="app-top-right">
            <button type="button" className="app-icon-btn" aria-label="Notifications">
              <Bell aria-hidden="true" />
            </button>
            <div className="app-profile">
              <div className="app-avatar" aria-hidden="true">{initials}</div>
              <div className="app-profile-txt">
                <span className="app-profile-name">{name}</span>
                <span className="app-profile-mail">{email}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="app-content">{children}</div>
      </div>
    </div>
  );
}
