'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LayoutGrid, Rows3, Plus } from 'lucide-react';
import { buttonClasses } from '@/components/ui/Button';

const FILTERS = [
  { id: 'all', label: 'Tous' },
  { id: 'evaluation', label: 'Éval' },
  { id: 'funded', label: 'Financés' },
] as const;

/**
 * Barre d'outils de la vue Comptes, sur la même ligne que le titre (réf. Edgely) :
 * bascule d'affichage Cartes/Compact, filtre par phase, et ajout d'un compte.
 * Chaque contrôle ne touche QUE sa clé d'URL — l'autre est préservée.
 */
export default function AccountsToolbar({ view, filter }: { view: string; filter: string }) {
  const router = useRouter();
  const sp = useSearchParams();

  const nav = (key: 'view' | 'filter', val: string) => {
    const p = new URLSearchParams(sp.toString());
    // Les valeurs par défaut ne polluent pas l'URL.
    if ((key === 'filter' && val === 'all') || (key === 'view' && val === 'cards')) p.delete(key);
    else p.set(key, val);
    const qs = p.toString();
    router.push(qs ? `/app/accounts?${qs}` : '/app/accounts');
  };

  return (
    <div className="acct-toolbar">
      <div className="acct-viewtoggle" role="group" aria-label="Affichage">
        <button
          type="button"
          className={`acct-vt${view === 'cards' ? ' is-active' : ''}`}
          aria-pressed={view === 'cards'}
          aria-label="Vue cartes"
          onClick={() => nav('view', 'cards')}
        >
          <LayoutGrid size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={`acct-vt${view === 'compact' ? ' is-active' : ''}`}
          aria-pressed={view === 'compact'}
          aria-label="Vue compacte"
          onClick={() => nav('view', 'compact')}
        >
          <Rows3 size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="acct-segmented" role="group" aria-label="Filtrer par phase">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`acct-seg${filter === f.id ? ' is-active' : ''}`}
            aria-pressed={filter === f.id}
            onClick={() => nav('filter', f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Link href="/app/accounts/new" className={buttonClasses()}>
        <Plus size={16} aria-hidden="true" />
        Ajouter un compte
      </Link>
    </div>
  );
}
