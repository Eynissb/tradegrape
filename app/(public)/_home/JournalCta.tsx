'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { buttonClasses } from '@/components/ui/Button';

/**
 * CTA du journal, conscient de la session — SANS rendre la home dynamique.
 *
 * La page reste statique (SSG/ISR) : le HTML servi porte toujours le libellé
 * DÉCONNECTÉ (« Ouvrir le journal gratuit » → /signup). C'est le bon défaut pour
 * les robots et les visiteurs anonymes, et c'est ce qu'indexe le SEO.
 *
 * Une fois monté, si une session existe, on bascule sur « Ouvrir mon journal »
 * → /app. La home reste une vitrine accessible même connecté (§ décision) : on
 * ne redirige jamais l'utilisateur connecté hors de la home.
 */
export default function JournalCta({
  signedOutLabel,
  signedInLabel,
}: {
  signedOutLabel: string;
  signedInLabel: string;
}) {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) setAuthed(!!data.session);
    });
    // Suit connexion / déconnexion sans recharger la page.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setAuthed(!!session);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <Link
      href={authed ? '/app' : '/signup'}
      className={buttonClasses({ variant: 'secondary', size: 'lg' })}
    >
      {authed ? signedInLabel : signedOutLabel}
    </Link>
  );
}
