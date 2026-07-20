import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Garde /app : utilisateur connecté requis.
 * Le middleware pose déjà le filtre, ce layout est la ceinture-bretelles
 * côté serveur (et sert de point d'ancrage pour la future navigation du journal).
 */
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

  return <>{children}</>;
}
