import { createClient } from '@/lib/supabase/server';

/** Les 6 rôles définis dans supabase/migrations/0001_catalog.sql (enum user_role). */
export type UserRole =
  | 'owner'
  | 'admin'
  | 'editor'
  | 'moderator'
  | 'analyst'
  | 'user';

/** Rôles considérés « staff » — accès à /admin (voir is_staff() côté SQL). */
export const STAFF_ROLES: readonly UserRole[] = [
  'owner',
  'admin',
  'editor',
  'moderator',
  'analyst',
];

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  locale: 'fr' | 'en';
  is_public: boolean;
}

export function isStaff(role: UserRole): boolean {
  return STAFF_ROLES.includes(role);
}

/**
 * Lit le profil de l'utilisateur connecté depuis la table profiles.
 * Retourne null si personne n'est connecté (ou profil introuvable).
 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('id, email, display_name, avatar_url, role, locale, is_public')
    .eq('id', user.id)
    .single<Profile>();

  return data ?? null;
}

/** Rôle de l'utilisateur connecté, ou 'user' par défaut. */
export async function getRole(): Promise<UserRole> {
  const profile = await getProfile();
  return profile?.role ?? 'user';
}
